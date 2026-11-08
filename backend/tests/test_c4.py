from datetime import timedelta
from uuid import uuid4
import json

import pytest
from web3 import Web3

from app.api.routes_scan import build_report
from app.models.schemas import MessageInput, Redirect, ScanReport
from app.web3 import registry
from app.web3.canonical import canonical_bytes, report_hash


def test_private_projection():
    report = build_report(MessageInput(message="Urgent contact alice@example.org or +91 98765 43210."))
    report.redirect_chain = [Redirect(url="https://example.org/private?otp=123456", status=301, domain="example.org")]
    report.indicators[0].evidence = "Private text and a password"
    payload = canonical_bytes(report)
    for private in (b"https://", b"alice@", b"98765", b"123456", b"password", b"Private text", b"Urgent contact"):
        assert private not in payload
    assert report_hash(report) == Web3.to_hex(Web3.keccak(payload))
    copy = ScanReport.model_validate_json(report.model_dump_json())
    copy.onchain.status = "disputed"
    copy.ai_explanation.summary = "Changed"
    copy.indicators[0].evidence = "Changed"
    assert report_hash(copy) == report_hash(report)
    assert payload == json.dumps(json.loads(payload), ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()


@pytest.mark.parametrize("path", ["id", "created_at", "input_type", "domain", "risk.classification",
    "risk.score", "risk.confidence", "indicators.0.id", "indicators.0.category", "indicators.0.severity",
    "redirect_chain.0.domain", "tls.valid", "tls.issuer", "tls.not_after", "tls.compromised_ca_flag",
    "threat_intel.0.source", "threat_intel.0.matched"])
def test_included_fields_change_hash(client, path):
    reports = client.get("/api/v1/reports").json()["items"]
    report = next(ScanReport.model_validate(r) for r in reports if r["tls"] and r["redirect_chain"])
    original = report_hash(report)
    parent = report
    steps = path.split(".")
    for key in steps[:-1]:
        parent = parent[int(key)] if key.isdecimal() else getattr(parent, key)
    changes = {"id": uuid4() if path == "id" else "another-indicator", "created_at": report.created_at + timedelta(seconds=1),
               "input_type": "message", "domain": "different.example", "classification": "inconclusive",
               "score": 99, "confidence": 0.2, "category": "dns", "severity": "critical", "valid": False,
               "issuer": "CN=Other CA", "not_after": report.tls.not_after + timedelta(days=1),
               "compromised_ca_flag": True, "source": "Other feed", "matched": True}
    setattr(parent, steps[-1], changes[steps[-1]])
    assert report_hash(report) != original


def test_publication_status_and_errors(client, mock_registry, monkeypatch):
    report = client.get("/api/v1/reports").json()["items"][0]
    path = "/api/v1/reports/" + report["id"]
    published = client.post(path + "/publish").json()
    assert client.post(path + "/publish").json() == published and len(mock_registry) == 1
    id = published["onchain"]["chain_report_id"]
    record = mock_registry[id]
    assert record["category"] == report["risk"]["classification"]
    record["status"] = "disputed"
    assert client.get(path).json()["onchain"]["status"] == "disputed"
    assert client.post(path + "/publish").json()["onchain"]["status"] == "disputed"
    assert len(mock_registry) == 1
    assert client.get(path + "/verify").json()["status"] == "disputed"
    record.update(status="revised", digest="0x" + "ea" * 32)
    assert client.get(path + "/verify").json()["match"] is False

    def offline(*args):
        raise ConnectionError("internal RPC detail")
    monkeypatch.setattr(registry, "Registry", offline)
    failed = client.get(path + "/verify")
    assert failed.status_code == 503 and failed.json()["error"]["code"] == "chain_unavailable"
    assert "RPC detail" not in failed.text
    fresh = client.post("/api/v1/scan/message", json={"message": "hello"}).json()
    failed = client.post("/api/v1/reports/" + fresh["id"] + "/publish")
    assert failed.status_code == 503 and failed.json()["error"]["code"] == "chain_unavailable"
    assert client.get("/api/v1/reports/" + fresh["id"] + "/verify").status_code == 409
    assert client.post(f"/api/v1/reports/{uuid4()}/publish").status_code == 404


def test_submit_calldata_contains_only_digest_and_category():
    from app.web3.registry import DEPLOYMENTS
    abi = json.loads((DEPLOYMENTS / "localhost.json").read_text())["abi"]
    contract = Web3().eth.contract(abi=abi)
    report = build_report(MessageInput(message="Contact alice@example.org at https://example.org/private"))
    digest = report_hash(report)
    encoded = contract.encode_abi("submitReport", args=[digest, report.risk.classification])
    raw = bytes.fromhex(encoded[2:])
    assert b"example" not in raw and b"alice" not in raw and b"private" not in raw
    _, args = contract.decode_function_input(encoded)
    assert args == {"reportHash": bytes.fromhex(digest[2:]), "category": report.risk.classification}
