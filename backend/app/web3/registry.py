import json
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock

from sqlalchemy.orm import Session
from web3 import Web3
from web3.logs import DISCARD

from app.core.db import read_report
from app.models.schemas import History, Onchain, VerifyResult
from app.web3.canonical import report_hash

NOTE = "The blockchain proves integrity and history of a report, not the truth of its contents."
STATUSES = ("published", "disputed", "validated", "revised")
DEPLOYMENTS = Path(__file__).resolve().parents[2] / "contracts" / "deployments"
SUBMIT_LOCK = Lock()


class ChainUnavailable(Exception):
    pass


class NotPublished(Exception):
    pass


class Registry:
    def __init__(self, settings, address=None):
        self.network = settings.chain_mode
        self.key = settings.deployer_private_key
        local = self.network == "local"
        expected = 31337 if local else 11155111
        manifest_path = DEPLOYMENTS / ("localhost.json" if local else "sepolia.json")
        manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
        abi = manifest.get("abi") or json.loads((DEPLOYMENTS / "localhost.json").read_text())["abi"]
        self.address = Web3.to_checksum_address(address or settings.contract_address or manifest["address"])
        self.start = manifest.get("blockNumber", 0) if self.address == manifest.get("address") else 0
        endpoint = "http://127.0.0.1:8545" if local else settings.sepolia_rpc_url.get_secret_value()
        self.w3 = Web3(Web3.HTTPProvider(endpoint, request_kwargs={"timeout": 8}))
        if self.w3.eth.chain_id != expected or not self.w3.eth.get_code(self.address):
            raise ChainUnavailable()
        self.contract = self.w3.eth.contract(address=self.address, abi=abi)

    def events(self, event, filters, start, end):
        # Public RPC services commonly limit the block range per log query.
        for first in range(start, end + 1, 2000):
            yield from event.get_logs(from_block=first, to_block=min(first + 1999, end), argument_filters=filters)

    def submit(self, digest, category):
        account = None
        if self.network == "local":
            sender = self.w3.eth.accounts[0]
        else:
            if not self.key:
                raise ChainUnavailable()
            account = self.w3.eth.account.from_key(self.key.get_secret_value())
            sender = account.address
        call = self.contract.functions.submitReport(digest, category)
        try:
            if account:
                tx = call.build_transaction({"from": sender, "nonce": self.w3.eth.get_transaction_count(sender, "pending")})
                signed = account.sign_transaction(tx)
                tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
            else:
                tx_hash = call.transact({"from": sender})
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=75)
            if receipt.status != 1:
                raise ChainUnavailable()
            event, = self.contract.events.ReportSubmitted().process_receipt(receipt, errors=DISCARD)
        except Exception:
            # A retry may follow mining but precede the original DB commit.
            event = next(self.events(self.contract.events.ReportSubmitted(),
                         {"reportHash": Web3.to_bytes(hexstr=digest), "reporter": sender},
                         self.start, self.w3.eth.block_number), None)
            if event is None:
                raise ChainUnavailable() from None
        if Web3.to_hex(event.args.reportHash) != digest or event.args.reporter != sender or event.args.category != category:
            raise ChainUnavailable()
        state = Onchain(status="published", report_hash=digest, tx_hash=Web3.to_hex(event.transactionHash),
                        chain_report_id=event.args.id, network=self.network, contract_address=self.address)
        return {"onchain": state.model_dump(mode="json"), "block": event.blockNumber}

    def get_onchain(self, id, block):
        digest, _, _, _, status, _ = self.contract.functions.getReport(id).call(block_identifier=block)
        return Web3.to_hex(digest), STATUSES[status]

    def get_history(self, id, start, end):
        rows = []
        for kind in ("ReportSubmitted", "StatusUpdated", "ReportRevised"):
            event = getattr(self.contract.events, kind)()
            for log in self.events(event, {"id": id}, start, end):
                status = {"ReportSubmitted": "published", "ReportRevised": "revised"}.get(kind)
                if status is None:
                    status = STATUSES[log.args.status]
                rows.append((log.blockNumber, log.logIndex, History(status=status,
                            tx_hash=Web3.to_hex(log.transactionHash),
                            timestamp=datetime.fromtimestamp(log.args.timestamp, UTC))))
        return [entry for _, _, entry in sorted(rows, key=lambda item: item[:2])]

    def inspect(self, receipt, history):
        state = Onchain.model_validate(receipt["onchain"])
        if state.network != self.network:
            raise ChainUnavailable()
        tip = self.w3.eth.block_number
        first = receipt["block"]
        # Bind the saved receipt to this chain incarnation, even across local node resets.
        mined = self.w3.eth.get_transaction_receipt(state.tx_hash)
        if mined.blockNumber != first or mined.to != self.address or mined.status != 1:
            raise ChainUnavailable()
        submitted, = self.contract.events.ReportSubmitted().process_receipt(mined, errors=DISCARD)
        if submitted.args.id != state.chain_report_id or Web3.to_hex(submitted.args.reportHash) != state.report_hash:
            raise ChainUnavailable()
        digest, status = self.get_onchain(state.chain_report_id, tip)
        events = self.get_history(state.chain_report_id, first, tip) if history else []
        return digest, status, events


def publish(db: Session, row, settings):
    with SUBMIT_LOCK:
        db.refresh(row)
        report = read_report(row)
        if report.onchain.status != "not_published":
            return current_report(row, settings)
        try:
            registry = Registry(settings)
            receipt = registry.submit(report_hash(report), report.risk.classification)
        except Exception:
            raise ChainUnavailable() from None
        row.receipt = receipt
        db.commit()
        return read_report(row)


def observed(row, settings, history=False):
    report = read_report(row)
    if report.onchain.status == "not_published":
        raise NotPublished()
    try:
        registry = Registry(settings, report.onchain.contract_address)
        digest, status, events = registry.inspect(row.receipt, history)
    except Exception:
        raise ChainUnavailable() from None
    report.onchain.status = status
    return report, digest, events


def current_report(row, settings):
    report = read_report(row)
    if report.onchain.status == "not_published":
        return report
    return observed(row, settings)[0]


def verify(row, settings):
    report, digest, events = observed(row, settings, history=True)
    recomputed = report_hash(report)
    return VerifyResult(report_id=report.id, match=digest == recomputed, recomputed_hash=recomputed,
                        onchain_hash=digest, status=report.onchain.status, network=report.onchain.network,
                        contract_address=report.onchain.contract_address, history=events, note=NOTE)
