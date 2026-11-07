from datetime import UTC, datetime
from hashlib import sha256

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.db import read_report
from app.models.orm import ReportRow
from app.models.schemas import History, Onchain, VerifyResult
from app.web3.canonical import report_hash

NETWORK = "local-stub"
ADDRESS = "0x" + "0" * 40
NOTE = "The blockchain proves integrity and history of a report, not the truth of its contents."


def publish(db: Session, row: ReportRow):
    report = read_report(row)
    if row.receipt is None:
        digest = report_hash(report)
        tx = "0x" + sha256(("local-stub:" + digest).encode()).hexdigest()
        state = Onchain(status="published", report_hash=digest, tx_hash=tx,
                        chain_report_id=report.id.int % (2**53 - 1), network=NETWORK,
                        contract_address=ADDRESS)
        history = History(status="published", tx_hash=tx, timestamp=datetime.now(UTC))
        receipt = {"onchain": state.model_dump(mode="json"), "history": [history.model_dump(mode="json")]}
        db.execute(update(ReportRow).where(ReportRow.id == row.id, ReportRow.receipt.is_(None))
                   .values(receipt=receipt))
        db.commit()
        db.refresh(row)
    return read_report(row)


def verify(row: ReportRow) -> VerifyResult:
    report = read_report(row)
    digest = report_hash(report)
    state = report.onchain
    return VerifyResult(report_id=report.id, match=digest == state.report_hash, recomputed_hash=digest,
                        onchain_hash=state.report_hash, status=state.status, network=NETWORK,
                        contract_address=ADDRESS, history=row.receipt["history"] if row.receipt else [],
                        note=NOTE)
