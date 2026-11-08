import json
import re
from datetime import UTC

from web3 import Web3

from app.models.schemas import ScanReport


def digest(text: str) -> str:
    return Web3.to_hex(Web3.keccak(text=text))


def label(value: str | None) -> str | None:
    # Normal detector IDs, DNS names and feed names are readable. Unexpected
    # free text (such as an email, URI or phone number) contributes only a digest.
    if value is None or (re.fullmatch(r"[A-Za-z0-9._: -]+", value)
                         and not re.search(r"(?:\d[ -]?){7,}", value)):
        return value
    return digest(value)


def canonical_bytes(report: ScanReport) -> bytes:
    tls = report.tls
    payload = {
        "id": str(report.id), "created_at": report.created_at.astimezone(UTC).isoformat(),
        "input_type": report.input_type, "domain": label(report.domain),
        "risk": report.risk.model_dump(include={"classification", "score", "confidence"}),
        "indicators": [{"id": label(i.id), "category": i.category, "severity": i.severity} for i in report.indicators],
        "redirect_domains": [label(hop.domain) for hop in report.redirect_chain],
        "tls": None if tls is None else {"valid": tls.valid, "issuer": digest(tls.issuer),
                    "not_after": tls.not_after.astimezone(UTC).isoformat(), "compromised_ca_flag": tls.compromised_ca_flag},
        "threat_intel": [{"source": label(i.source), "matched": i.matched} for i in report.threat_intel],
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def report_hash(report: ScanReport) -> str:
    return Web3.to_hex(Web3.keccak(canonical_bytes(report)))
