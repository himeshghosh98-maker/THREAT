import json
import ssl
from datetime import UTC, datetime, timedelta
from ipaddress import ip_address

import httpx
import pytest
from cryptography import x509
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from app.analyzers import intel, tls
from app.core import ssrf
from app.models.orm import FeedSnapshot
from app.models.schemas import ScanReport


def scan(client, url="https://github.com"):
    response = client.post("/api/v1/scan/url", json={"url": url})
    assert response.status_code == 200
    report = ScanReport.model_validate(response.json())
    assert client.get(f"/api/v1/reports/{report.id}").json() == response.json()
    return report


@pytest.mark.parametrize(("kwargs", "indicator"), [
    ({"start": -40, "end": -2}, "tls-expired"), ({"start": 2}, "tls-future"),
    ({"issuer": "example.org"}, "tls-self-signed"),
    ({"issuer": "eMudhra C2 Example Only"}, "tls-ca"),
])
def test_certificate_findings(certificate, kwargs, indicator):
    cert = certificate("example.org", **kwargs)
    report, items = tls.inspect("example.org", [cert], False)
    assert indicator in {item.id for item in items}
    assert "tls-untrusted" in {item.id for item in items}
    assert report.disclaimer == "A valid certificate is not proof that the site is safe."
    assert report.compromised_ca_flag == (indicator == "tls-ca")
    if report.compromised_ca_flag:
        assert "linked to a CA reported as compromised or distrusted" in report.findings


def test_key_signature_and_hostname(certificate):
    weak = rsa.generate_private_key(public_exponent=65537, key_size=1024)
    leaf = certificate("*.example.org", key=weak)
    # Replace both RSA signature algorithm identifiers in this untrusted test certificate.
    der = leaf.public_bytes(serialization.Encoding.DER)
    sha256_oid = bytes.fromhex("06092a864886f70d01010b")
    sha1_oid = bytes.fromhex("06092a864886f70d010105")
    leaf = x509.load_der_x509_certificate(der.replace(sha256_oid, sha1_oid))
    report, items = tls.inspect("a.b.example.org", [leaf], False)
    assert {"tls-key", "tls-signature", "tls-hostname"} <= {i.id for i in items}
    assert report.signature_algorithm == "sha1" and report.key_size == 1024
    assert tls.inspect("a.example.org", [leaf], False)[0].hostname_match


@pytest.mark.asyncio
async def test_tls_pins_the_retry(monkeypatch, certificate):
    calls = []
    async def peer(ip, port, host, verify):
        calls.append((ip, port, host, verify))
        if verify:
            raise ssl.SSLCertVerificationError("test untrusted chain")
        return [certificate(host)]
    monkeypatch.setattr(tls, "handshake", peer)
    report, items = await tls.analyze(HttpUrl("https://example.org:8443"))
    assert calls == [(ip_address("93.184.216.34"), 8443, "example.org", True),
                     (ip_address("93.184.216.34"), 8443, "example.org", False)]
    assert not report.valid and "tls-untrusted" in {i.id for i in items}


def test_ct_timeout_persists_partial_report(client, network):
    original = network.handler
    def handler(req):
        if req.headers["host"] == "crt.sh":
            raise httpx.ReadTimeout("fixture timeout")
        return original(req)
    network.handler = handler
    report = scan(client)
    assert report.tls.valid and report.tls.ct_notes
    assert "Certificate transparency" in report.risk.checks_failed and report.risk.confidence < 1


def test_ct_history(client, network):
    original = network.handler
    now = datetime.now(UTC)
    rows = [{"serial_number": str(i), "issuer_name": "new", "not_before": now.isoformat()} for i in range(5)]
    rows.append({"serial_number": "old", "issuer_name": "old", "not_before": (now - timedelta(days=90)).isoformat()})
    network.handler = lambda req: network.response(data=json.dumps(rows + rows).encode(),
        headers={"content-type": "application/json"}) if req.headers["host"] == "crt.sh" else original(req)
    cert = scan(client).tls
    assert cert.ct_records_count == 6 and len(cert.ct_notes) == 2


def test_headers_reuse_single_fetch(client, network):
    original = network.handler
    def handler(req):
        if req.headers["host"] == "github.com":
            return network.response(data=b"<img src='http://assets.example/x'>", headers={
                "content-type": "text/html", "server": "Example/3.2", "set-cookie": "secret=value"})
        return original(req)
    network.handler = handler
    report = scan(client)
    assert [r.method for r in network.requests if r.headers["host"] == "github.com"] == ["HEAD", "GET"]
    assert {"strict-transport-security", "content-security-policy", "cookie-secure", "cookie-httponly",
            "cookie-samesite", "server-version", "mixed-content"} <= {i.id for i in report.indicators}
    assert all(f.severity in {"medium", "low"} and f.limitations for f in report.security_headers)
    assert "secret=value" not in report.model_dump_json()


def test_http(client):
    report = scan(client, "http://github.com")
    assert report.tls is None and "tls-http" in {i.id for i in report.indicators}
    assert "http-page" in {i.id for i in report.indicators}


def test_openphish_refresh_and_matches(client, network):
    exact = scan(client, "https://listed.example/login")
    assert exact.risk.classification == "confirmed_malicious" and exact.threat_intel[0].matched
    host = scan(client, "https://listed.example/other")
    assert host.risk.classification == "suspicious" and host.threat_intel[0].matched
    assert sum(r.headers["host"] == "raw.githubusercontent.com" for r in network.requests) == 1
    with Session(client.app.state.engine) as db:
        snapshot = db.get(FeedSnapshot, intel.OPENPHISH)
        snapshot.refreshed_at = datetime.now(UTC) - timedelta(hours=7)
        db.commit()
    clean = scan(client)
    assert sum(r.headers["host"] == "raw.githubusercontent.com" for r in network.requests) == 2
    assert all(e.detail == "No match found in this source. This does not indicate the site is safe."
               for e in clean.threat_intel)


def test_unavailable_sources(client, network):
    client.app.state.settings.google_safe_browsing_key = None
    original = network.handler
    network.handler = lambda req: network.response(503) if req.headers["host"] == "raw.githubusercontent.com" else original(req)
    report = scan(client)
    assert report.risk.classification == "low_risk" and report.risk.confidence < 1
    assert {intel.OPENPHISH, intel.GOOGLE} <= set(report.risk.checks_failed)
    assert report.threat_intel[1].detail == "not configured"
    assert all(e.detail != intel.NO_MATCH and not e.matched for e in report.threat_intel)
    assert not any(r.headers["host"] == "safebrowsing.googleapis.com" for r in network.requests)


def test_google_match_and_secret_redirect(client, network):
    original = network.handler
    def handler(req):
        if req.headers["host"] == "safebrowsing.googleapis.com":
            assert req.method == "POST" and "x-goog-api-key" in req.headers
            target = json.loads(req.content)["threatInfo"]["threatEntries"][0]["url"]
            return network.response(data=json.dumps({"matches": [{"threat": {"url": target}}]}).encode(),
                                    headers={"content-type": "application/json"})
        return original(req)
    network.handler = handler
    assert scan(client).risk.classification == "confirmed_malicious"
    network.handler = lambda req: network.response(307, headers={"location": "https://unexpected.example"}) if (
        req.headers["host"] == "safebrowsing.googleapis.com") else original(req)
    report = scan(client)
    assert intel.GOOGLE in report.risk.checks_failed
    assert not any(r.headers["host"] == "unexpected.example" for r in network.requests)


def test_seed_shapes(client):
    reports = [ScanReport.model_validate(row) for row in client.get("/api/v1/reports").json()["items"]]
    assert len(reports) == 7
    urls = [r for r in reports if r.input_type == "url"]
    assert all(r.tls and r.threat_intel for r in urls)
    assert any(r.security_headers for r in urls)


def test_tls_and_http_share_initial_resolution(client, monkeypatch, network, certificate):
    original = ssrf.safe_resolve
    resolutions, tls_ips = [], []

    async def resolve(host):
        if host == "github.com":
            resolutions.append(host)
            return [ip_address("1.1.1.1")]
        return await original(host)

    async def handshake(address, port, host, verify):
        tls_ips.append(str(address))
        return [certificate(host)]

    monkeypatch.setattr(ssrf, "safe_resolve", resolve)
    monkeypatch.setattr(tls, "handshake", handshake)
    scan(client)
    assert resolutions == ["github.com"] and tls_ips == ["1.1.1.1"]
    assert [r.url.host for r in network.requests if r.headers["host"] == "github.com"] == tls_ips * 2


def test_stale_feed_failure_does_not_become_clean(client, network):
    scan(client)
    with Session(client.app.state.engine) as db:
        row = db.get(FeedSnapshot, intel.OPENPHISH)
        row.refreshed_at = datetime.now(UTC) - timedelta(hours=8)
        db.commit()
    original = network.handler
    network.handler = lambda req: network.response(data=b"invalid feed") if (
        req.headers["host"] == "raw.githubusercontent.com") else original(req)
    report = scan(client)
    assert intel.OPENPHISH in report.risk.checks_failed
    assert report.threat_intel[0].detail != intel.NO_MATCH
    with Session(client.app.state.engine) as db:
        snapshot = db.get(FeedSnapshot, intel.OPENPHISH)
        assert snapshot.entries["urls"] and snapshot.refreshed_at < datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=6)
