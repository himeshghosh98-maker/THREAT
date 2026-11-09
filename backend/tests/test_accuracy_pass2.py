from datetime import UTC, datetime
import json
import os
from unittest.mock import AsyncMock

import pytest
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.ai.message import analyze_message, extract_links
from app.ai.privacy import redact
from app.analyzers import intel, phishing, tls
from app.core import ssrf
from app.core.risk import score_risk
from app.models.orm import FeedSnapshot
from app.models.schemas import MessageInput
from scripts import accuracy_eval as evaluation


def test_accuracy_gates():
    rows = evaluation.evaluate("all")
    if os.getenv("WRITE_ACCURACY_REPORT") == "1":
        evaluation.report(rows)
    assert len(rows) == len({r["id"] for r in rows}) >= 120
    for split in ("tune", "test"):
        group = [r for r in rows if r["split"] == split]
        rates = evaluation.rates(group)
        assert rates["FPR"][0] == 0
        rejected, attacks = rates["attack rejection"]
        assert rejected == attacks > 0
        assert all(r["deterministic"] and r["band"] for r in group)


def test_ocr_literal_extraction_and_privacy():
    raw = ("Use hxxps : / / paypa1 (dot) com / verify,\nwww . sbi-kyc . xyz! "
           "sbi-kyc-\nupdate.xyz or bit.ly/abc. Write help @ bank [.] org or pay test @ ybl. "
           "Call +91 98765.43210. hxxps://paypa1[.]com/verify")
    text = MessageInput(message=raw).message
    assert extract_links(text) == ["https://paypa1.com/verify", "https://www.sbi-kyc.xyz/",
                                   "https://sbi-kyc-update.xyz/", "https://bit.ly/abc"]
    analysis, findings = analyze_message(text)
    assert analysis.extracted_emails == ["help@bank.org"] and len(analysis.extracted_phones) == 1
    assert {i.id for i in findings} >= {"upi-address", "ocr-ambiguity"}
    ambiguous, = [i for i in findings if i.id == "ocr-ambiguity"]
    assert ambiguous.severity == "info" and "l/1/I" in ambiguous.evidence
    assert "paypa1" not in ambiguous.evidence
    assert all(value not in redact(text) for value in ("test@ybl", "98765", "help@"))
    assert extract_links("hxxps://p\u0430y\u200bpal\u3002com/log\u200bin")[0].startswith("https://xn--")


@pytest.mark.parametrize("message,signal", [
    ("Apna OTP batayein abhi", "credential-request"), ("Apnar PIN bolun", "credential-request"),
    ("KYC update korun nahole account bondho", "identity-update"),
    ("Refund pete age taka pathan", "advance-fee"), ("SIM band ho jayega", "service-cutoff"),
    ("Claim your lottery prize", "reward-claim"), ("Parcel customs fee due", "delivery-fee"),
    ("Challan pending: pay now", "toll-fine"), ("Aadhaar verify now", "identity-update"),
    ("Customer care number par call karein refund ke liye", "care-solicitation"),
])
def test_indian_signals(message, signal):
    _, items = analyze_message(message)
    assert signal in {item.id for item in items}
    assert score_risk(items, ["Local message rules"], []).classification in evaluation.POSITIVE


@pytest.mark.parametrize("message", ["Urgent, call me", "Your KYC update was completed.",
                                     "Apnar statement ready", "Please never share your PIN"])
def test_similar_benign_messages(message):
    _, items = analyze_message(message)
    assert score_risk(items, ["Local message rules"], []).classification == "low_risk"


def test_brand_ownership_platform_and_corroboration():
    def inspect(url):
        return phishing.inspect_url(HttpUrl("https://" + url))
    assert not inspect("support.kotak.com/login")
    assert [i.id for i in inspect("paypal.education")] == ["brand-other-suffix"]
    assert not inspect("reading-group.github.io")
    assert {i.id for i in inspect("micros0ft-login.xyz")} >= {"brand-lookalike", "brand-corroboration"}
    assert score_risk(inspect("micros0ft-login.xyz"), ["URL structure"], []).classification == "high_risk"
    assert [i.id for i in inspect("ordinary.top")] == ["listed-tld"]


@pytest.mark.asyncio
async def test_ct_cache_retry_expiry_and_cause(monkeypatch):
    failed = ssrf.FetchResult([], failed=True, failure_reason="HTTP status 502")
    record = {"issuer_name": "A", "serial_number": "01", "not_before": "2020-01-01"}
    body = json.dumps([record, record, dict(record, issuer_name="B")]).encode()
    from app.models.schemas import Redirect
    good = ssrf.FetchResult([Redirect(url="hxxps://crt[.]sh", domain="crt.sh", status=200)], body=body)
    fetch = AsyncMock(side_effect=[failed, good, failed, failed])
    monkeypatch.setattr(ssrf, "safe_fetch", fetch)
    clock = [0]
    monkeypatch.setattr(tls, "monotonic", lambda: clock[0])
    assert await tls.transparency("EXAMPLE.ORG") == (2, [])
    assert await tls.transparency("example.org.") == (2, [])
    assert fetch.await_count == 2
    clock[0] += 86400
    with pytest.raises(ssrf.FetchFailure, match="502"):
        await tls.transparency("example.org")
    assert fetch.await_count == 4


def test_optional_vs_failed_source(client, network):
    client.app.state.settings.google_safe_browsing_key = None
    url = {"url": "https://github.com"}
    clean = client.post("/api/v1/scan/url", json=url).json()
    assert clean["risk"]["confidence"] == 1 and clean["limitations"].count("Google Safe Browsing is not configured") == 1
    original = network.handler
    network.handler = lambda req: network.response(403) if req.headers["host"] == "crt.sh" else original(req)
    tls._CT_CACHE.clear()
    partial = client.post("/api/v1/scan/url", json=url).json()
    assert partial["tls"]["ct_records_count"] == -1
    assert "Certificate transparency" in partial["risk"]["checks_failed"]
    assert 0 < partial["risk"]["confidence"] < 1


@pytest.mark.asyncio
async def test_feed_normalization_and_shared_host(client):
    engine = client.app.state.engine
    source = intel.OpenPhish(engine)
    source.store([HttpUrl("HTTPS://Tenant.Pages.Dev:443/a/%7eb/")], datetime.now(UTC))
    exact = await source.check(HttpUrl("https://tenant.pages.dev/a/~b#fragment"), "tenant.pages.dev")
    assert exact.matched and exact.authoritative
    for path in ("/a%2Fb", "/unrelated"):
        assert not (await source.check(HttpUrl("https://tenant.pages.dev" + path), "tenant.pages.dev")).matched


@pytest.mark.asyncio
async def test_second_feed_partial_line_bad_refresh(client, monkeypatch):
    engine = client.app.state.engine
    source = intel.PhishingDatabase(engine)
    from app.models.schemas import Redirect
    import httpx
    body = b"https://verified.example/page\nhttps://trunca"
    result = ssrf.FetchResult([Redirect(domain="example.org", url="hxxps://example[.]org", status=206)],
                              body, headers=httpx.Headers({"content-range": f"bytes 0-{len(body)-1}/1000"}))
    monkeypatch.setattr(ssrf, "safe_fetch", AsyncMock(return_value=result))
    entries = await source.snapshot(force=True)
    assert len(entries["urls"]) == 1
    result.body = b"bad data"
    with pytest.raises(ssrf.FetchFailure):
        await source.snapshot(force=True)
    with Session(engine) as db:
        assert db.get(FeedSnapshot, source.name).entries == entries


def test_weighted_coverage_and_authoritative_class():
    core = score_risk([], ["OpenPhish"], ["Link 1: HTTP redirects"], authoritative_hit=True)
    ancillary = score_risk([], ["OpenPhish"], ["Certificate transparency"], authoritative_hit=True)
    assert core.classification == ancillary.classification == "confirmed_malicious"
    assert core.confidence == 0.5 < ancillary.confidence == 0.75
