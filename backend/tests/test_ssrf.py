from types import SimpleNamespace

import pytest
from pydantic import HttpUrl

from app.core import ssrf
from app.core.defang import display_url


@pytest.mark.asyncio
@pytest.mark.parametrize("url", [
    "http://localhost", "http://127.0.0.1", "http://169.254.169.254/latest", "http://10.1.2.3",
    "http://172.16.1.1", "http://192.168.20.1", "http://0.0.0.0", "http://100.64.0.1",
    "http://2130706433", "http://0x7f000001", "http://0177.0.0.1", "http://[::1]",
    "http://[fc00::1]", "http://[fe80::123]", "http://[::ffff:8.8.8.8]",
    "http://good.com@evil.com", "ftp://example.com", "file:///etc/hosts", "http://example.com:25",
    "http://224.0.0.1", "http://168.63.129.16",
])
async def test_invalid_input_never_connects(network, url):
    with pytest.raises(ssrf.BlockedTarget):
        await ssrf.safe_fetch(url)
    assert not network.requests


@pytest.mark.asyncio
async def test_mixed_public_private_dns(monkeypatch, network):
    async def mixed(host, kind):
        return [SimpleNamespace(address="1.1.1.1"), SimpleNamespace(address="192.168.1.1")]
    monkeypatch.setattr(ssrf, "dns_answer", mixed)
    with pytest.raises(ssrf.BlockedTarget):
        await ssrf.safe_resolve("example.org")
    assert (await ssrf.safe_fetch("https://example.org")).failed
    assert not network.requests


@pytest.mark.asyncio
@pytest.mark.parametrize("destination", ["http://10.0.0.1", "http://user@example.org", "ftp://example.org"])
async def test_redirect_policy(network, destination):
    network.handler = lambda req: network.response(302, headers={"location": destination})
    result = await ssrf.safe_fetch("https://Example.org:8443/x")
    assert result.failed and [hop.status for hop in result.chain] == [302]
    request, = network.requests
    assert request.url.host == "93.184.216.34"
    assert request.headers["host"] == "example.org:8443"
    assert request.extensions["sni_hostname"] == "example.org"


@pytest.mark.asyncio
async def test_same_host_rebinding(monkeypatch, network):
    resolutions = 0
    original = ssrf.dns_answer

    async def dns(host, kind):
        nonlocal resolutions
        if kind == "A":
            resolutions += 1
            if resolutions == 2:
                return [SimpleNamespace(address="127.0.0.1")]
        return await original(host, kind)

    monkeypatch.setattr(ssrf, "dns_answer", dns)
    network.handler = lambda req: network.response(302, headers={"location": "/second"})
    assert (await ssrf.safe_fetch("https://example.org")).failed
    assert resolutions == 2 and len(network.requests) == 1


@pytest.mark.asyncio
async def test_redirect_limit(network):
    network.handler = lambda req: network.response(302, headers={"location": "/again"})
    result = await ssrf.safe_fetch("https://example.org", max_redirects=15)
    assert result.failed and len(result.chain) == 6


@pytest.mark.asyncio
async def test_size_and_content_boundaries(network):
    network.handler = lambda req: network.response(data=b"12345")
    assert (await ssrf.safe_fetch("https://example.org", max_bytes=4)).failed
    for headers in [{"content-type": "application/octet-stream"},
                    {"content-type": "text/plain", "content-disposition": "attachment"},
                    {"content-type": "text/html", "content-encoding": "gzip"}]:
        network.handler = lambda req: network.response(data=b"ignored", headers=headers)
        result = await ssrf.safe_fetch("https://example.org")
        assert result.body == b"" and not result.failed


def test_defang():
    assert display_url(HttpUrl("https://a:p@EVIL.COM/reset?token=123")) == "hxxps://evil[.]com"
    assert display_url(HttpUrl("http://evil.com:8080")) == "hxxp://evil[.]com:8080"


@pytest.mark.asyncio
async def test_total_timeout(monkeypatch, network):
    import asyncio

    async def slow(host, kind):
        await asyncio.sleep(1)
    monkeypatch.setattr(ssrf, "dns_answer", slow)
    result = await ssrf.safe_fetch("https://example.org", timeout=0.01)
    assert result.failed and not network.requests


@pytest.mark.asyncio
async def test_binary_body_never_iterated(network):
    import httpx

    class ForbiddenStream(httpx.AsyncByteStream):
        async def __aiter__(self):
            raise AssertionError("binary stream consumed")
            yield b""

    network.handler = lambda req: httpx.Response(200, headers={"content-type": "application/pdf"},
                                                  stream=ForbiddenStream())
    result = await ssrf.safe_fetch("https://example.org")
    assert not result.failed and result.body == b""
