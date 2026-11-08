from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
import json

import pytest
from pydantic import HttpUrl

from app.analyzers import phishing
from app.core import ssrf
from app.core.risk import score_risk
from app.models.schemas import ErrorResponse, ScanReport

PATH = "/api/v1/scan/url"


def scan(client, url):
    response = client.post(PATH, json={"url": url})
    assert response.status_code == 200, response.text
    report = ScanReport.model_validate(response.json())
    assert report.ai_explanation and report.message_analysis is None
    assert (report.tls is not None) == url.startswith("https:")
    assert report.precautions and report.limitations
    return report


@pytest.mark.parametrize(("host", "category"), [
    ("paypa1.com", "typosquat"), ("g00gle-login.com", "typosquat"),
    ("xn--pple-43d.com", "homograph"), ("sbi-secure-login.xyz", "typosquat"),
])
def test_phishing(client, host, category):
    report = scan(client, f"https://{host}")
    assert report.risk.classification in {"suspicious", "high_risk"}
    assert category in {item.category for item in report.indicators}
    assert client.get(f"/api/v1/reports/{report.id}").json() == report.model_dump(mode="json")
    assert str(report.id) in {item["id"] for item in client.get("/api/v1/reports").json()["items"]}


@pytest.mark.parametrize("host", ["github.com", "www.google.com"])
def test_official_domains(client, host):
    report = scan(client, "https://" + host)
    assert report.risk.classification == "low_risk" and not report.indicators
    assert report.risk.confidence == 1 and not report.risk.checks_failed
    assert "No significant indicators found in the available checks." in report.limitations


def test_rdap_failure(client, network):
    handler = network.handler
    network.handler = lambda req: network.response(503) if req.headers["host"] == "rdap.org" else handler(req)
    report = scan(client, "https://github.com")
    assert report.risk.classification == "inconclusive"
    assert report.risk.checks_failed == ["RDAP"] and report.risk.confidence == round(len(report.risk.checks_completed) / (len(report.risk.checks_completed) + 1), 2)
    assert not any("No significant indicators" in note for note in report.limitations)


@pytest.mark.asyncio
@pytest.mark.parametrize(("days", "severity"), [(29, "high"), (30, "medium"), (179, "medium"), (180, None)])
async def test_registration_age(days, severity, network):
    date = datetime.now(UTC) - timedelta(days=days)
    record = {"ldhName": "example.org", "events": [{"eventAction": "registration", "eventDate": date.isoformat()}]}
    network.handler = lambda req: network.response(data=json.dumps(record).encode(),
                                                  headers={"content-type": "application/rdap+json"})
    assert [i.severity for i in await phishing.domain_age("www.example.org")] == ([severity] if severity else [])


@pytest.mark.asyncio
async def test_dns_indicators(network, monkeypatch):
    async def dns(host, kind):
        records = network.records(range(9) if kind == "A" else [])
        records.rrset = SimpleNamespace(ttl=10)
        return records
    monkeypatch.setattr(ssrf, "dns_answer", dns)
    assert {i.id for i in await phishing.dns_indicators("test.example.org")} == {
        "no-mx", "low-ttl", "many-addresses"}


def test_url_features():
    url = HttpUrl("https://google.a.b.c.d.evil---login.xyz/@" + "x" * 200 + "?url=http://elsewhere.com")
    assert {i.id for i in phishing.inspect_url(url)} >= {"at-sign", "brand-subdomain", "long-url",
        "listed-tld", "deep-subdomain", "embedded-url", "many-hyphens"}
    assert "ip-literal" in {i.id for i in phishing.inspect_url(HttpUrl("https://1.1.1.1"))}


def test_cross_domain_chain(client, network):
    handler = network.handler
    def redirect(req):
        host = req.headers["host"]
        if host == "bit.ly":
            return network.response(301, headers={"location": "https://example.org/1"})
        if host == "example.org" and req.url.path in {"/1", "/2", "/3"}:
            return network.response(302, headers={"location": "/" + str(int(req.url.path[1:]) + 1)})
        return handler(req)
    network.handler = redirect
    report = scan(client, "https://bit.ly/x")
    assert [hop.status for hop in report.redirect_chain] == [301, 302, 302, 302, 200]
    assert {i.id for i in report.indicators} >= {"shortener", "long-chain", "cross-domain", "cross-host"}


def test_rate_limit(client):
    for _ in range(10):
        scan(client, "https://github.com")
    response = client.post(PATH, json={"url": "https://github.com"})
    assert response.status_code == 429
    assert ErrorResponse.model_validate(response.json()).error.code == "rate_limited"


def test_risk_weights_and_authoritative_hook():
    items = phishing.inspect_url(HttpUrl("https://paypa1.com"))
    assert score_risk(items, ["URL"], ["DNS"]).classification == "suspicious"
    other = phishing.evidence("recent-domain", "domain_age", "Young domain", "high", "10 days", "RDAP")
    assert score_risk([*items, other], ["URL", "RDAP"], []).classification == "high_risk"
    confirmed = score_risk([], ["intel"], [], authoritative_hit=True)
    assert confirmed.classification == "confirmed_malicious" and confirmed.score == 100


@pytest.mark.parametrize("url", ["http://good.com@evil.com", "https://127.0.0.1", "https://example.org:999",
                                 "ftp://example.org"])
def test_api_rejects_prohibited_inputs(client, network, url):
    response = client.post(PATH, json={"url": url})
    assert response.status_code == 422
    assert ErrorResponse.model_validate(response.json()).error.code == "validation_error"
    assert not network.requests


def test_one_check_crashing_preserves_other_evidence(client, monkeypatch):
    async def broken(host):
        raise RuntimeError("simulated DNS outage")
    monkeypatch.setattr(phishing, "dns_indicators", broken)
    report = scan(client, "https://paypa1.com")
    assert report.risk.classification == "suspicious"
    assert report.risk.checks_failed == ["DNS"] and report.redirect_chain
