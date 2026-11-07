import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.main import create_app
from scripts.seed import seed


@pytest.fixture
def client(tmp_path):
    settings = Settings(database_url=f"sqlite:///{tmp_path}/db.sqlite",
                        cors_origins="http://localhost:3000, https://ui.example", google_safe_browsing_key="test-only",
                        llm_provider="anthropic", anthropic_api_key=None, openai_api_key=None, gemini_api_key=None)
    app = create_app(settings)
    app.state.limiter.reset()
    with TestClient(app) as client:
        with Session(app.state.engine) as db:
            seed(db)
            seed(db)
        yield client


@pytest.fixture(autouse=True)
def network(monkeypatch):
    """Run the real pipeline against deterministic DNS and HTTP transports."""
    import json
    from types import SimpleNamespace

    import httpx
    from app.core import ssrf

    class Records(list):
        rrset = SimpleNamespace(ttl=600)

    async def answer(host, kind):
        if kind == "A":
            return Records([SimpleNamespace(address="93.184.216.34")])
        if kind == "MX":
            return Records([SimpleNamespace(exchange="mail.example.")])
        return Records()

    class Body(httpx.AsyncByteStream):
        def __init__(self, data):
            self.data = data

        async def __aiter__(self):
            yield self.data

    def response(status=200, data=b"demo", headers=None):
        return httpx.Response(status, headers=headers or {"content-type": "text/html"}, stream=Body(data))

    def handler(request):
        host = request.headers["host"]
        if host == "crt.sh":
            return response(data=b"[]", headers={"content-type": "application/json"})
        if host == "raw.githubusercontent.com":
            return response(data=b"https://listed.example/login", headers={"content-type": "text/plain"})
        if host == "safebrowsing.googleapis.com":
            return response(data=b"{}", headers={"content-type": "application/json"})

        if request.headers["host"] == "rdap.org":
            domain = request.url.path.split("/")[-1]
            record = {"ldhName": domain, "events": [{"eventAction": "registration",
                       "eventDate": "2000-01-01T00:00:00Z"}]}
            return response(data=json.dumps(record).encode(), headers={"content-type": "application/rdap+json"})
        return response(headers={"content-type": "text/html", "strict-transport-security": "max-age=31536000",
                                 "content-security-policy": "default-src 'self'", "x-frame-options": "DENY",
                                 "x-content-type-options": "nosniff", "referrer-policy": "no-referrer"})

    fixture = SimpleNamespace(requests=[], handler=handler, response=response, records=Records)

    async def transport(self, request):
        fixture.requests.append(request)
        return fixture.handler(request)

    monkeypatch.setattr(ssrf, "dns_answer", answer)
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", transport)
    return fixture


@pytest.fixture(scope="session")
def signing_key():
    from cryptography.hazmat.primitives.asymmetric import rsa
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture
def certificate(signing_key):
    from datetime import UTC, datetime, timedelta
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes
    from cryptography.x509.oid import NameOID

    def issue(host, *, start=-30, end=60, issuer="Training CA", key=None):
        now = datetime.now(UTC)
        name = lambda value: x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, value)])
        return (x509.CertificateBuilder().subject_name(name(host)).issuer_name(name(issuer))
                .public_key((key or signing_key).public_key()).serial_number(x509.random_serial_number())
                .not_valid_before(now + timedelta(days=start)).not_valid_after(now + timedelta(days=end))
                .add_extension(x509.SubjectAlternativeName([x509.DNSName(host)]), critical=False)
                .sign(signing_key, hashes.SHA256()))
    return issue


@pytest.fixture(autouse=True)
def tls_transport(monkeypatch, certificate):
    from app.analyzers import tls
    async def handshake(address, port, host, verify):
        return [certificate(host)]
    monkeypatch.setattr(tls, "handshake", handshake)
