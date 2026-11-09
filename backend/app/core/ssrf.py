"""The only outbound HTTP transport. Resolve and pin a new connection on every hop."""
import asyncio
import ipaddress
import logging
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
    for attempt in range(2):
        try:
            return await dns.asyncresolver.resolve(host + ".", record, search=False, lifetime=4,
                                                   raise_on_no_answer=False)
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            return ()
        except (dns.exception.Timeout, dns.resolver.NoNameservers):
            if attempt:
                raise


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
        raise FetchFailure("No address records")
    return addresses


@dataclass
class FetchResult:
    chain: list[Redirect]
    body: bytes = b""
    failed: bool = False
    headers: httpx.Headers | None = None
    failure_reason: str | None = None


def log_failure(check, exc):
    # Untrusted exception text may contain the entire URL, headers or response.
    # Only emit our fixed messages, DNS/transport categories and OS error numbers.
    if isinstance(exc, (TransientStatus, FetchFailure)):
        detail = str(exc)
    elif isinstance(exc, BlockedTarget):
        detail = "Destination rejected by policy"
    elif isinstance(exc, dns.exception.DNSException):
        detail = "DNS lookup failed"
    elif isinstance(exc, TimeoutError) or isinstance(exc, httpx.TimeoutException):
        detail = "Request deadline expired"
    else:
        detail = "Operation failed"
    errno = getattr(exc, "errno", None)
    logging.getLogger(__name__).warning("%s %s: %s%s", check, type(exc).__name__, detail,
                                        f" (errno {errno})" if isinstance(errno, int) else "")


class TransientStatus(OSError):
    """A retryable upstream HTTP status."""


class FetchFailure(ValueError):
    """Only fixed diagnostic text or numeric HTTP status belongs here."""


async def pinned_request(client, current, address, method, max_bytes, json_body, api_key, byte_range=None):
    logical = httpx.URL(str(current))
    host = current.host.strip("[]").rstrip(".")
    headers = {"Host": logical.netloc.decode(), "Accept-Encoding": "identity",
               "User-Agent": "Mozilla/5.0 (compatible; ThreatReport/1.0; passive security scanner)"}
    if byte_range is not None:
        headers["Range"] = f"bytes=0-{byte_range-1}"
    if api_key is not None:
        headers["X-Goog-Api-Key"] = api_key.get_secret_value()
    pinned = logical.copy_with(host=str(address), fragment=None)
    async with client.stream(method, pinned, headers=headers, json=json_body, follow_redirects=False,
                             extensions={"sni_hostname": host}) as response:
        if response.status_code in {502, 503, 504} and method != "POST":
            raise TransientStatus(f"HTTP status {response.status_code}")
        body = bytearray()
        mime = response.headers.get("content-type", "").partition(";")[0].lower()
        textual = mime.startswith("text/") or mime in {"application/json", "application/rdap+json"}
        if (method != "HEAD" and not response.has_redirect_location and textual
                and "attachment" not in response.headers.get("content-disposition", "").lower()
                and response.headers.get("content-encoding", "identity").lower() == "identity"):
            async for chunk in response.aiter_raw():
                if len(body) + len(chunk) > min(max_bytes, 1_000_000):
                    raise FetchFailure("Response exceeded byte limit")
                body.extend(chunk)
        return response.status_code, response.headers, bytes(body), response.has_redirect_location


async def try_addresses(addresses, operation):
    # Validate the entire answer before opening even the first connection.
    ordered = sorted({public_ip(str(a)) for a in addresses}, key=lambda ip: (ip.version, int(ip)))
    if not ordered:
        raise FetchFailure("No address records")
    retried_status = False
    for address in [*ordered, ordered[0]]:
        try:
            async with asyncio.timeout(5):
                return address, await operation(address)
        except (OSError, httpx.TransportError) as exc:
            log_failure("Pinned connection", exc)
            if isinstance(exc, TransientStatus):
                if retried_status:
                    raise
                retried_status = True
            last = exc
    raise last


async def safe_fetch(url, max_redirects=5, timeout=20, max_bytes=1_000_000, *, resolution=None,
                     json_body=None, api_key=None, observations=None, page=False, byte_range=None) -> FetchResult:
    current = validate_url(url)
    if json_body is not None or api_key is not None:
        if str(current) != "https://safebrowsing.googleapis.com/v4/threatMatches:find":
            raise BlockedTarget("Invalid intelligence endpoint.")
        max_redirects = 0
    chain = []
    try:
        async with asyncio.timeout(timeout):
            for hop in range(min(max_redirects, 5) + 1):
                host = current.host.strip("[]").rstrip(".")
                addresses = (await asyncio.shield(resolution) if hop == 0 and resolution is not None
                             else await safe_resolve(host))
                # Fresh client on every hop prevents cookie and connection reuse across origins.
                async with httpx.AsyncClient(trust_env=False, timeout=5) as client:
                    async def request(address):
                        method = "POST" if json_body is not None else "HEAD" if page else "GET"
                        result = await pinned_request(client, current, address, method, max_bytes, json_body, api_key, byte_range)
                        if page and not result[3]:
                            if result[0] >= 400:
                                return await pinned_request(client, current, address, "GET", max_bytes, None, None)
                            if "html" in result[1].get("content-type", "").lower():
                                # Optional bounded body inspection. Retain the final HEAD metadata
                                # when the body is larger than the allowed inspection window.
                                try:
                                    get = await pinned_request(client, current, address, "GET", max_bytes, None, None)
                                except FetchFailure as exc:
                                    log_failure("Page body", exc)
                                else:
                                    if get[0] < 400:
                                        return get
                        return result
                    address, (status, headers, body, redirect) = await try_addresses(addresses, request)
                if observations is not None:
                    observations.add(("ip", str(address)))
                chain.append(Redirect(url=display_url(current), status=status, domain=host))
                if not redirect:
                    if status >= 400:
                        log_failure("HTTP", FetchFailure(f"HTTP status {status}"))
                    return FetchResult(chain, body, headers=headers)
                if hop >= min(max_redirects, 5):
                    raise FetchFailure("Redirect limit exceeded")
                current = validate_url(urljoin(str(current), headers["location"]))
    except (ValueError, OSError, dns.exception.DNSException, httpx.HTTPError) as exc:
        log_failure("HTTP fetch", exc)
        detail = str(exc) if isinstance(exc, (FetchFailure, TransientStatus)) else type(exc).__name__
        return FetchResult(chain, failed=True, failure_reason=detail)
    return FetchResult(chain, failed=True)
