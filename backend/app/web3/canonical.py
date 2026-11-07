import hashlib
import json

from app.models.schemas import ScanReport


def report_hash(report: ScanReport) -> str:
    payload = report.model_dump(mode="json", exclude={"onchain"})
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return "0x" + hashlib.sha256(encoded).hexdigest()
