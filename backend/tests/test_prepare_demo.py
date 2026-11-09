from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.analyzers.intel import OpenPhish
from app.core.db import read_report
from app.models.orm import FeedSnapshot, ReportRow
from scripts import prepare_demo as demo


@pytest.mark.parametrize("initial,count,age,refresh", [
    ("missing", 0, 0, True), ("empty", 0, 1, True), ("fresh", 1, 5, False),
    ("expired", 1, 6, True), ("rotated", 1, 1, True),
])
@pytest.mark.asyncio
async def test_feed_check(client, monkeypatch, capsys, initial, count, age, refresh):
    url = HttpUrl("https://listed.example/private?token=never-print")
    engine = client.app.state.engine
    with Session(engine) as db:
        if initial != "missing":
            hashes = [demo.url_digest(url) if initial != "rotated" else "old"] if count else []
            db.add(FeedSnapshot(source=demo.OPENPHISH, refreshed_at=datetime.now(UTC) - timedelta(hours=age),
                                entries={"urls": hashes, "hosts": []}))
            db.commit()
    monkeypatch.setattr(OpenPhish, "download_urls", AsyncMock(return_value=[url]))
    assert await demo.feed_sample(engine) == str(url)
    hashes, elapsed = demo.cache_info(engine, datetime.now(UTC))
    assert demo.url_digest(url) in hashes
    assert (elapsed < timedelta(minutes=1)) == refresh
    output = capsys.readouterr().out
    assert "PASS OpenPhish cache | 1 entries, age " in output
    assert "never-print" not in output and "listed.example" not in output


@pytest.mark.asyncio
async def test_refresh_failure_retains_snapshot(client, monkeypatch, capsys):
    engine = client.app.state.engine
    with Session(engine) as db:
        db.add(FeedSnapshot(source=demo.OPENPHISH, refreshed_at=datetime.now(UTC)-timedelta(hours=8),
                            entries={"urls": ["old"], "hosts": []}))
        db.commit()
    monkeypatch.setattr(OpenPhish, "download_urls", AsyncMock(side_effect=ValueError("secret")))
    with pytest.raises(demo.DemoFailure, match="publisher unavailable"):
        await demo.feed_sample(engine)
    assert demo.cache_info(engine, datetime.now(UTC))[0] == {"old"}
    output = capsys.readouterr().out
    assert "FAIL OpenPhish cache" in output and "secret" not in output


def test_seed_recovery_preserves_real_scans(client, mock_registry):
    settings, engine = client.app.state.settings, client.app.state.engine
    address = "0x" + "ab" * 20
    real = client.post("/api/v1/scan/message", json={"message": "A real scan"}).json()
    ids = demo.prepare_fixtures(engine, settings, address)
    with Session(engine) as db:
        demo.publish(db, db.get(ReportRow, ids[1]), settings)
        before = [read_report(db.get(ReportRow, key)).model_dump(mode="json") for key in ids]
    mock_registry.clear()
    assert demo.prepare_fixtures(engine, settings, address) == ids
    assert len(mock_registry) == 2
    assert demo.prepare_fixtures(engine, settings, address) == ids
    with Session(engine) as db:
        after = [read_report(db.get(ReportRow, key)).model_dump(mode="json") for key in ids]
        for old, new in zip(before, after):
            assert {k: v for k, v in old.items() if k != "onchain"} == {k: v for k, v in new.items() if k != "onchain"}
    assert client.get("/api/v1/reports/" + real["id"]).json() == real


def test_smoke_uses_api_and_flags_unexpected_verdict(client):
    address = "0x" + "ab" * 20
    ids = demo.prepare_fixtures(client.app.state.engine, client.app.state.settings, address)
    client.base_url = httpx.URL("http://testserver/api/v1/")
    assert demo.smoke(client, "https://listed.example/login", ids, address)
    client.app.state.limiter.reset()
    assert not demo.smoke(client, "https://example.org/", ids, address)


def test_nonlocal_chain_reports_recovery_and_redacts_keys(client, monkeypatch, capsys):
    settings = client.app.state.settings.model_copy(update={"chain_mode": "sepolia"})
    monkeypatch.setattr(demo, "Settings", lambda: settings)
    monkeypatch.setattr(demo, "open_database", lambda _: client.app.state.engine)
    monkeypatch.setattr(demo, "feed_sample", AsyncMock(return_value="sample"))
    assert demo.main() == 1
    output = capsys.readouterr().out
    assert "FAIL Local chain" in output and demo.START_CHAIN in output
    assert "GOOGLE_SAFE_BROWSING_KEY (optional) | configured" in output
    assert "test-only" not in output


def test_process_ownership(monkeypatch):
    process = MagicMock()
    process.poll.return_value = None
    spawn = MagicMock(return_value=process)
    monkeypatch.setattr(demo.subprocess, "Popen", spawn)
    monkeypatch.setattr(demo, "healthy", lambda _: True)
    with demo.running_api(None):
        pass
    spawn.assert_not_called()
    health = iter([False, True])
    monkeypatch.setattr(demo, "healthy", lambda _: next(health))
    with pytest.raises(demo.DemoFailure):
        with demo.running_api(None):
            raise demo.DemoFailure("test")
    process.terminate.assert_called_once()
    process.wait.assert_called_once()
