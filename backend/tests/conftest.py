import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.main import create_app
from scripts.seed import seed


@pytest.fixture
def client(tmp_path):
    settings = Settings(database_url=f"sqlite:///{tmp_path}/db.sqlite",
                        cors_origins="http://localhost:3000, https://ui.example")
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
        if request.headers["host"] == "rdap.org":
            domain = request.url.path.split("/")[-1]
            record = {"ldhName": domain, "events": [{"eventAction": "registration",
                       "eventDate": "2000-01-01T00:00:00Z"}]}
            return response(data=json.dumps(record).encode(), headers={"content-type": "application/rdap+json"})
        return response()

    fixture = SimpleNamespace(requests=[], handler=handler, response=response, records=Records)

    async def transport(self, request):
        fixture.requests.append(request)
        return fixture.handler(request)

    monkeypatch.setattr(ssrf, "dns_answer", answer)
    monkeypatch.setattr(httpx.AsyncHTTPTransport, "handle_async_request", transport)
    return fixture
