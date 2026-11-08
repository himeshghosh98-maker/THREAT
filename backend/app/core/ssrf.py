"""The only outbound HTTP transport. Resolve and pin a new connection on every hop."""
import asyncio
import ipaddress
import re
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit

import dns.asyncresolver
import httpx
from pydantic import HttpUrl

from app.core.defang import display_url
from app.models.schemas import Redirect

IP = ipaddress.IPv4Address | ipaddress.IPv6Address
PORTS = {80, 443, 8080, 8443}
# Cloud platform virtual service addresses can be globally numbered.
PLATFORM_IPS = {"168.63.129.16", "100.100.100.200"}


class BlockedTarget(ValueError):
    pass


def public_ip(value: str) -> IP:
    ip = ipaddress.ip_address(value)
    if (not ip.is_global or ip.is_multicast or ip.is_reserved or ip.is_loopback
            or ip.is_link_local or str(ip) in PLATFORM_IPS
            or isinstance(ip, ipaddress.IPv6Address) and
            (ip.ipv4_mapped or ip.sixtofour or ip.teredo or ip.is_site_local)):
        raise BlockedTarget("Non-public destination.")
    return ip


def validate_host(host: str):
    if "%" in host or not host:
        raise BlockedTarget("Invalid hostname.")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        if ("." not in host or host.endswith((".localhost", ".local", ".internal", ".home.arpa"))
                or re.fullmatch(r"(?:0x[0-9a-f]+|[0-9]+)(?:\.(?:0x[0-9a-f]+|[0-9]+))*", host, re.I)):
            raise BlockedTarget("Local or ambiguous hostname.")
    else:
        public_ip(host)


def validate_url(value: str | HttpUrl) -> HttpUrl:
    raw = str(value).strip()
    if "\\" in raw or any(ord(c) < 32 for c in raw):
        raise BlockedTarget("Invalid URL.")
    try:
        parts = urlsplit(raw)
        if parts.scheme not in {"http", "https"} or "@" in parts.netloc:
            raise BlockedTarget("Unsupported scheme or credentials.")
        url = HttpUrl(raw)
        if url.port not in PORTS or parts.port == 0:
            raise BlockedTarget("Unsupported port.")
        validate_host(url.host.strip("[]").rstrip("."))
    except ValueError as exc:
        raise BlockedTarget("A public HTTP(S) URL on an allowed port is required.") from exc
    return url


async def dns_answer(host, record):
    return await dns.asyncresolver.resolve(host + ".", record, search=False, lifetime=4,
                                          raise_on_no_answer=False)


async def safe_resolve(host: str) -> list[IP]:
    host = host.lower().strip("[]").rstrip(".")
    validate_host(host)
    try:
        return [public_ip(host)]
    except BlockedTarget:
        raise
    except ValueError:
        pass
    answers = await asyncio.gather(dns_answer(host, "A"), dns_answer(host, "AAAA"))
    addresses = [public_ip(record.address) for answer in answers for record in answer]
    if not addresses:
        raise OSError("No address records.")
    return addresses


@dataclass
class FetchResult:
    chain: list[Redirect]
    body: bytes = b""
    failed: bool = False
    headers: httpx.Headers | None = None


async def safe_fetch(url, max_redirects=5, timeout=8, max_bytes=1_000_000, *, resolution=None, json_body=None, api_key=None, observations=None) -> FetchResult:
    current = validate_url(url)
    if json_body is not None or api_key is not None:
        if str(current) != "https://safebrowsing.googleapis.com/v4/threatMatches:find":
            raise BlockedTarget("Invalid intelligence endpoint.")
        max_redirects = 0
    chain: list[Redirect] = []
    try:
        async with asyncio.timeout(timeout):
            for hop in range(min(max_redirects, 5) + 1):
                host = current.host.strip("[]").rstrip(".")
                if hop == 0 and resolution is not None:
                    addresses = await asyncio.shield(resolution)
                else:
                    addresses = await safe_resolve(host)
                address = public_ip(str(addresses[0]))
                logical = httpx.URL(str(current))
                pinned = logical.copy_with(host=str(address), fragment=None)
                headers = {"Host": logical.netloc.decode(), "Accept-Encoding": "identity"}
                if api_key is not None:
                    headers["X-Goog-Api-Key"] = api_key.get_secret_value()
                # A fresh client prevents cross-origin cookie and TLS connection reuse.
                async with httpx.AsyncClient(trust_env=False, timeout=timeout) as client:
                    async with client.stream("POST" if json_body is not None else "GET", pinned, headers=headers,
                                             json=json_body, follow_redirects=False,
                                             extensions={"sni_hostname": host}) as response:
                        if observations is not None:
                            observations.add(("ip", str(address)))
                        chain.append(Redirect(url=display_url(current), status=response.status_code,
                                              domain=host))
                        if response.has_redirect_location:
                            if hop >= min(max_redirects, 5):
                                break
                            current = validate_url(urljoin(str(current), response.headers["location"]))
                            continue
                        content_type = response.headers.get("content-type", "").partition(";")[0].lower()
                        textual = content_type.startswith("text/") or content_type in {
                            "application/json", "application/rdap+json"}
                        if (not textual or "attachment" in response.headers.get("content-disposition", "").lower()
                                or response.headers.get("content-encoding", "identity").lower() != "identity"):
                            return FetchResult(chain, headers=response.headers)
                        body = bytearray()
                        async for chunk in response.aiter_raw():
                            if len(body) + len(chunk) > min(max_bytes, 1_000_000):
                                return FetchResult(chain, failed=True)
                            body.extend(chunk)
                        return FetchResult(chain, bytes(body), headers=response.headers)
    except (ValueError, OSError, TimeoutError, dns.exception.DNSException, httpx.HTTPError):
        pass
    return FetchResult(chain, failed=True)
