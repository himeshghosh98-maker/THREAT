from sqlalchemy.orm import Session

from app.api.routes_scan import build_report
from app.core.config import Settings
from app.core.db import insert_report
from app.models.orm import ReportRow
from app.models.schemas import MessageInput
from app.web3.registry import publish, verify


def test_settings_from_environment(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", " http://localhost:3000, ,https://ui.example ")
    assert Settings().origins == ["http://localhost:3000", "https://ui.example"]


def test_default_settings(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert Settings(_env_file=None).origins == ["http://localhost:3000"]


def test_tampered_record(client):
    report = build_report(MessageInput(message="hello"))
    with Session(client.app.state.engine) as db:
        insert_report(db, report)
        db.commit()
        row = db.get(ReportRow, str(report.id))
        publish(db, row)
        row.report = dict(row.report, limitations=["Changed after publication."])
        db.commit()
        result = verify(row)
        assert not result.match and result.recomputed_hash != result.onchain_hash
