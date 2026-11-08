import json
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.correlation import contact_hash
from app.core.http import BODY_LIMIT, audit
from app.models.orm import IndicatorRow, ReportRow
from app.models.schemas import Correlations, ErrorResponse


def message(client, text):
    response = client.post("/api/v1/scan/message", json={"message": text})
    assert response.status_code == 200
    return response.json()


def test_sql_correlation_from_live_observations(client, network, certificate, monkeypatch):
    leaf = certificate("link.example.org")
    async def handshake(address, port, host, verify):
        return [leaf]
    monkeypatch.setattr("app.analyzers.tls.handshake", handshake)
    original = network.handler
    def handler(req):
        if req.headers["host"] == "rdap.org":
            data = {"ldhName": "example.org", "events": [{"eventAction": "registration", "eventDate": "2000-01-01T00:00:00Z"}],
                    "entities": [{"roles": ["registrar"], "publicIds": [{"type": "IANA Registrar ID", "identifier": "123"}]}]}
            return network.response(data=json.dumps(data).encode(), headers={"content-type": "application/json"})
        if req.headers["host"] == "link.example.org":
            return network.response(302, headers={"location": "https://target.example.org/landing"})
        return original(req)
    network.handler = handler
    first = message(client, "Call +91 98765 43210 or A@example.org about https://link.example.org")
    second = message(client, "Use a@example.org or 9876543210 and https://link.example.org")
    unrelated = message(client, "Call 9123456789 or other@example.org")
    result = client.get("/api/v1/intel/correlations")
    clusters = Correlations.model_validate(result.json()).clusters
    matched = [c for c in clusters if str(first["id"]) in {str(i) for i in c.report_ids}]
    assert {c.indicator_type for c in matched} == {"email", "phone", "registrar", "redirect_target", "ip", "cert_fingerprint"}
    assert all({str(i) for i in c.report_ids} == {first["id"], second["id"]} for c in matched)
    assert unrelated["id"] not in result.text
    assert result.json() == client.get("/api/v1/intel/correlations").json()
    assert {c.shared_indicator for c in matched if c.indicator_type == "redirect_target"} == {"target.example.org"}
    with Session(client.app.state.engine) as db:
        storage = json.dumps(db.get(ReportRow, first["id"]).report)
        indexed = list(db.scalars(select(IndicatorRow.value)))
    for raw in ("98765 43210", "9876543210", "a@example.org", "A@example.org"):
        assert raw not in storage and raw not in result.text and all(raw not in value for value in indexed)
    assert contact_hash("phone", "9876543210", "11" * 32) != contact_hash("phone", "9876543210", "22" * 32)


def test_message_and_publish_rate_limits(client):
    reports = [r["id"] for r in client.get("/api/v1/reports").json()["items"]]
    for i in range(10):
        assert client.post("/api/v1/scan/message", json={"message": "hello"}).status_code == 200
        assert client.post(f"/api/v1/reports/{reports[i % len(reports)]}/publish").status_code == 200
    for response in (client.post("/api/v1/scan/message", json={"message": "hello"}),
                     client.post(f"/api/v1/reports/{reports[-1]}/publish")):
        assert response.status_code == 429
        assert ErrorResponse.model_validate(response.json()).error.code == "rate_limited"


def test_declared_and_chunked_limits(client):
    for body, headers in ((b"x" * (BODY_LIMIT + 1), {}),
                          (iter([b"x" * BODY_LIMIT, b"x"]), {"transfer-encoding": "chunked"})):
        response = client.post("/api/v1/scan/message", content=body, headers=headers)
        assert response.status_code == 413
        assert ErrorResponse.model_validate(response.json()).error.code == "body_too_large"
        assert response.headers["x-content-type-options"] == "nosniff"


def test_structured_logs_and_security_headers(client, caplog):
    audit.addHandler(caplog.handler)
    try:
        with caplog.at_level(logging.INFO):
            response = client.post("/api/v1/scan/message?token=test-key", json={
                "message": "user@example.org phone +91 98765 43210 secret hidden-value https://example.org"})
            missing = client.get("/private-value?token=test-key")
    finally:
        audit.removeHandler(caplog.handler)
    assert response.status_code == 200 and missing.status_code == 404
    for response in (response, missing):
        assert response.headers["content-security-policy"] and response.headers["x-frame-options"] == "DENY"
        assert response.headers["referrer-policy"] == "no-referrer"
    events = [json.loads(record.message) for record in caplog.records if record.name == audit.name]
    assert [e["status"] for e in events] == [200, 404]
    assert all(set(e) == {"event", "method", "status", "duration_ms"} for e in events)
    for value in ("example.org", "user@", "98765", "hidden-value", "private-value", "test-key", "://"):
        assert value not in caplog.text

def test_first_start_migrates_existing_contacts_and_preserves_hashes(tmp_path):
    from sqlalchemy import create_engine
    from app.api.routes_scan import build_report
    from app.core.db import open_database
    from app.models.orm import Base
    from app.models.schemas import MessageInput

    url = f"sqlite:///{tmp_path}/legacy.sqlite"
    old = create_engine(url)
    Base.metadata.create_all(old)
    report = build_report(MessageInput(message="Email legacy@example.org or call 9876543210"))
    id = str(report.id)
    with Session(old) as db:
        db.add(ReportRow(id=id, created_at=report.created_at, classification=report.risk.classification,
                         report=report.model_dump(mode="json")))
        db.commit()
    old.dispose()
    snapshots = []
    for _ in range(2):
        engine = open_database(url)
        with Session(engine) as db:
            stored = json.dumps(db.get(ReportRow, id).report)
            assert "legacy@example.org" not in stored and "9876543210" not in stored
            snapshots.append(sorted(db.scalars(select(IndicatorRow.value))))
        engine.dispose()
    assert len(snapshots[0]) == 2 and snapshots[0] == snapshots[1]
