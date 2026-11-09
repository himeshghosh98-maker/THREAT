import pytest
from ipaddress import ip_address
from types import SimpleNamespace

import dns.resolver
import httpx

from app.analyzers.phishing import evidence
from app.core import ssrf
from app.core.risk import BANDS, HYGIENE_CAP, score_risk
from app.web3.registry import NOTE
from scripts.reseed_chain_receipts import reseed
from sqlalchemy.orm import Session

REAL_DNS_ANSWER = ssrf.dns_answer


@pytest.mark.parametrize("host,expected", [
    ("github.com", "inconclusive"), ("www.google.com", "inconclusive"),
    ("en.wikipedia.org", "inconclusive"), ("www.sbi.co.in", "inconclusive"),
    ("www.iitkgp.ac.in", "inconclusive"), ("paypa1.com", "suspicious"),
    ("g00gle-login.com", "high_risk"), ("xn--pypal-4ve.com", "high_risk"),
])
def test_core_outage(client, network, monkeypatch, host, expected):
    async def absent(host, kind):
        return network.records([])
    monkeypatch.setattr(ssrf, "dns_answer", absent)
    risk = client.post("/api/v1/scan/url", json={"url": "https://" + host}).json()["risk"]
    assert {"DNS", "HTTP redirects", "TLS"} <= set(risk["checks_failed"])
    assert risk["classification"] == expected
    assert BANDS[expected][0] <= risk["score"] <= BANDS[expected][1]


def test_hygiene_cap():
    items = [evidence(str(i), "headers", "Missing policy", "medium", "Absent", "HTTP") for i in range(40)]
    risk = score_risk(items, ["DNS", "HTTP redirects", "TLS"], [])
    assert risk.classification == "low_risk" and risk.score == HYGIENE_CAP
    ttl = evidence("low-ttl", "dns", "Short TTL", "info", "20 seconds", "DNS")
    assert score_risk([ttl], ["DNS"], []).score == 0


@pytest.mark.parametrize("message,category", [
    ("Pay a processing fee to receive your job offer", "job-fee"),
    ("Please send the registration fee", "advance-fee"),
    ("Upload documents to receive your job offer", "job-documents"),
    ("Provide your CVV", "credential-request"), ("Claim your lottery prize", "reward-claim"),
    ("Approve the UPI collect request", "upi-collect"), ("Your account will be blocked", "account-threat"),
    ("Google support: provide your PIN", "claimed-identity"),
])
def test_solicitations(client, message, category):
    report = client.post("/api/v1/scan/message", json={"message": message}).json()
    assert category in {item["id"] for item in report["indicators"]}
    assert report["risk"]["classification"] in {"suspicious", "high_risk"}


@pytest.mark.parametrize("message", ["Urgent! Act now.", "Weekly newsletter from GitHub", "Lunch tomorrow?",
                                     "The library opens at nine.", "SBI: your statement is available.",
                                     "Calendar invite for Friday", "Receipt: your processing fee was paid."])
def test_benign_and_urgency(client, message):
    risk = client.post("/api/v1/scan/message", json={"message": message}).json()["risk"]
    assert risk["classification"] == "low_risk" and risk["score"] <= HYGIENE_CAP


def test_kyc_score(client):
    msg = "SBI: update KYC immediately or your account will be blocked. Visit https://paypa1.com."
    risk = client.post("/api/v1/scan/message", json={"message": msg}).json()["risk"]
    assert risk["classification"] == "suspicious" and 20 <= risk["score"] <= 59


def test_missing_receipt_and_recovery(client, mock_registry):
    path = "/api/v1/reports/" + client.get("/api/v1/reports").json()["items"][0]["id"]
    stored = client.post(path + "/publish").json()
    mock_registry.clear()
    assert client.get(path).json() == stored
    assert stored in client.get("/api/v1/reports").json()["items"]
    result = client.get(path + "/verify")
    assert result.status_code == 200
    data = result.json()
    assert data["status"] == "not_found_on_chain" and data["onchain_hash"] is None
    assert not data["match"] and data["note"] == NOTE and data["history"] == []
    with Session(client.app.state.engine) as db:
        reseed(db, client.app.state.settings)
        reseed(db, client.app.state.settings)
    assert len(mock_registry) == 1 and client.get(path + "/verify").json()["match"]


@pytest.mark.asyncio
async def test_negative_family(monkeypatch):
    async def resolve(host, kind, **kwargs):
        if kind == "AAAA":
            raise dns.resolver.NXDOMAIN()
        return [SimpleNamespace(address="1.1.1.1")]
    monkeypatch.setattr(ssrf, "dns_answer", REAL_DNS_ANSWER)
    monkeypatch.setattr(dns.asyncresolver, "resolve", resolve)
    assert await ssrf.safe_resolve("example.org") == [ip_address("1.1.1.1")]


@pytest.mark.asyncio
async def test_pinned_fallback_and_head_rejection(network, monkeypatch):
    async def resolve(host):
        return [ip_address("1.1.1.1"), ip_address("8.8.8.8")]
    monkeypatch.setattr(ssrf, "safe_resolve", resolve)
    def handle(req):
        if req.url.host == "1.1.1.1":
            raise httpx.ConnectTimeout("fixture")
        return network.response(405) if req.method == "HEAD" else network.response()
    network.handler = handle
    result = await ssrf.safe_fetch("https://example.org", page=True)
    assert not result.failed and result.chain[-1].status == 200
    assert [req.method for req in network.requests] == ["HEAD", "HEAD", "GET"]
    assert all(req.headers["host"] == req.extensions["sni_hostname"] == "example.org" for req in network.requests)


def test_redirect_headers_only_describe_final_page(client, network):
    original = network.handler
    def handle(req):
        if req.headers["host"] == "before.example":
            return network.response(302, headers={"location": "https://after.example/",
                                                  "strict-transport-security": "max-age=31536000"})
        if req.headers["host"] == "after.example":
            return network.response(headers={"content-type": "text/html",
                                             "content-security-policy-report-only": "default-src 'self'"})
        return original(req)
    network.handler = handle
    report = client.post("/api/v1/scan/url", json={"url": "https://before.example"}).json()
    issues = {finding["issue"] for finding in report["security_headers"]}
    assert {"CSP in report-only mode", "Missing HSTS"} <= issues
    assert [hop["status"] for hop in report["redirect_chain"]] == [302, 200]


@pytest.mark.asyncio
async def test_rdap_bootstrap(network):
    from app.analyzers.phishing import domain_age
    original = network.handler
    def handle(req):
        host = req.headers["host"]
        if host == "rdap.org":
            return network.response(404)
        if host == "data.iana.org":
            return network.response(data=b'{"services":[[["com"],["https://registry.example/db/"]]]}',
                                    headers={"content-type": "application/json"})
        if host == "registry.example":
            assert req.url.path == "/db/domain/example.com"
            return network.response(data=b'{"ldhName":"example.com","events":[{"eventAction":"registration","eventDate":"2000-01-01T00:00:00Z"}]}',
                                    headers={"content-type": "application/rdap+json"})
        return original(req)
    network.handler = handle
    assert await domain_age("www.example.com") == []


def test_critical_ca_and_embedded_domain():
    from pydantic import HttpUrl
    from app.analyzers.phishing import inspect_url
    ca = evidence("tls-ca", "tls", "Distrusted CA", "critical", "Match", "TLS")
    assert score_risk([ca], ["TLS"], []).classification == "high_risk"
    for host, expected in [("other.org", "suspicious"), ("www.example.org", "low_risk")]:
        items = inspect_url(HttpUrl(f"https://example.org/?next=https://{host}/"))
        assert score_risk(items, ["URL structure", "DNS", "HTTP redirects", "TLS"], []).classification == expected
