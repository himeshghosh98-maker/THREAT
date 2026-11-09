import asyncio
import json
from hashlib import sha256
import re
import unicodedata
from datetime import UTC, datetime
from ipaddress import ip_address
from pathlib import Path
from urllib.parse import parse_qsl

import idna
import tldextract
from pydantic import HttpUrl
from rapidfuzz.distance import Levenshtein

from app.core import ssrf
from app.models.schemas import Indicator

DATA = Path(__file__).parents[1] / "data"
BRANDS = json.loads((DATA / "brands.json").read_text())
TLDS = set(json.loads((DATA / "suspicious_tlds.json").read_text()))
# Use the bundled PSL, with no HTTP updates or shared disk cache.
extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None, include_psl_private_domains=True)
CONFUSABLES = str.maketrans("аеорсхуіјӏαρο", "aeopcxyijlapo")


def registered(host: str) -> str:
    return extract(host).top_domain_under_public_suffix or host


def evidence(key, category, title, severity, detail, source):
    return Indicator(id=key, category=category, title=title, severity=severity,
                     evidence=detail, source=source)


def inspect_url(url: HttpUrl) -> list[Indicator]:
    host = url.host.strip("[]").rstrip(".")
    parts = extract(host)
    reg = registered(host)
    domain_label = parts.domain.lower()
    items = []

    def flag(key, title, detail, severity="medium", category="url_structure"):
        items.append(evidence(key, category, title, severity, detail, "URL and local reference lists"))

    official = any(host == domain or host.endswith("." + domain)
                   for domains in BRANDS.values() for domain in domains)
    if not official:
        tokens = [domain_label, *domain_label.split("-")]
        for brand in BRANDS:
            distance = min(Levenshtein.distance(token, brand) for token in tokens)
            if distance <= (1 if len(brand) >= 5 else 0) or (
                    len(brand) >= 5 and min(Levenshtein.distance(t.translate(str.maketrans("01", "ol")), brand)
                                           for t in tokens) <= 1):
                flag("brand-lookalike", "Brand-like domain label",
                     f"The registered label resembles {brand} (edit distance {distance}).", "high", "typosquat")
                break
        for brand in BRANDS:
            if brand in parts.subdomain and brand not in reg:
                flag("brand-subdomain", "Brand in subdomain", f"{brand} occurs outside the registered domain.")
                break

    if not official and any(label.startswith("xn--") for label in host.split(".")):
        flag("idn-label", "Internationalized domain label", "The host includes a punycode label.", "low", "homograph")
        for label in host.split("."):
            if not label.startswith("xn--"):
                continue
            decoded = idna.decode(label)
            scripts = {unicodedata.name(c, "").split(" ")[0] for c in decoded if c.isalpha()}
            if len(scripts) > 1 or decoded.translate(CONFUSABLES) != decoded:
                flag("confusable-label", "Visually confusable label",
                     "A decoded label mixes scripts or contains a listed lookalike character.", "high", "homograph")
                break
    if "@" in str(url):
        flag("at-sign", "At-sign in URL", "The URL contains an at-sign.")
    try:
        ip_address(host)
    except ValueError:
        pass
    else:
        flag("ip-literal", "Numeric destination", "The authority is a literal IP address.")
    if parts.subdomain and len(parts.subdomain.split(".")) > 3:
        flag("deep-subdomain", "Deeply nested hostname", "More than three subdomain labels precede the registered domain.")
    destinations = [value for _, value in parse_qsl(url.query or "") if value.lower().startswith(("http://", "https://"))]
    for value in destinations:
        try:
            target = HttpUrl(value)
        except ValueError:
            continue
        if registered(target.host) == reg:
            continue
        flag("embedded-url", "URL-valued parameter", "A query parameter contains an external HTTP(S) destination.")
        break
    if host.split(".")[-1] in TLDS:
        flag("listed-tld", "Listed suffix", "The final label appears in the local suffix watchlist.")
    if len(str(url)) > 200:
        flag("long-url", "Long URL", "The normalized URL exceeds 200 characters.", "low")
    if domain_label.count("-") >= 3:
        flag("many-hyphens", "Repeated hyphens", "The registered label contains at least three hyphens.")
    return items


async def domain_age(host: str, observations=None) -> list[Indicator]:
    domain = extract(host).top_domain_under_public_suffix
    if not domain:
        raise ssrf.FetchFailure("No registrable domain")
    result = await ssrf.safe_fetch(f"https://rdap.org/domain/{domain}")
    if result.failed or not result.chain or result.chain[-1].status != 200:
        # Fall back to IANA's DNS bootstrap when the RDAP redirector is unavailable.
        bootstrap = await ssrf.safe_fetch("https://data.iana.org/rdap/dns.json")
        if not bootstrap.failed and bootstrap.chain and bootstrap.chain[-1].status == 200:
            services = json.loads(bootstrap.body)["services"]
            suffix = domain.rsplit(".", 1)[-1]
            bases = next((bases for suffixes, bases in services if suffix in suffixes), [])
            base = next((url for url in bases if url.startswith("https://")), None)
            if base:
                result = await ssrf.safe_fetch(base.rstrip("/") + "/domain/" + domain)
    if result.failed or not result.chain or result.chain[-1].status != 200:
        raise ssrf.FetchFailure("RDAP unavailable")
    record = json.loads(result.body)
    if record.get("ldhName", "").lower().rstrip(".") != domain:
        raise ssrf.FetchFailure("RDAP domain mismatch")
    if observations is not None:
        for entity in record.get("entities", []):
            if "registrar" in entity.get("roles", []):
                for identifier in entity.get("publicIds", []):
                    number = str(identifier.get("identifier", ""))
                    if identifier.get("type") == "IANA Registrar ID" and number.isascii() and number.isdigit():
                        observations.add(("registrar", "sha256:" + sha256(("iana:" + number).encode()).hexdigest()))
    dates = [datetime.fromisoformat(event["eventDate"]) for event in record["events"]
             if event.get("eventAction") == "registration"]
    days = (datetime.now(UTC) - min(dates)).days
    if days < 0:
        raise ssrf.FetchFailure("Invalid registration date")
    if days >= 180:
        return []
    return [evidence("recent-domain", "domain_age", "Recently registered domain",
                     "high" if days < 30 else "medium", f"Registration was {days} days ago.", "RDAP registration event")]


async def dns_indicators(host: str) -> list[Indicator]:
    a, mx = await asyncio.gather(ssrf.dns_answer(host, "A"), ssrf.dns_answer(registered(host), "MX"))
    if not a:
        await ssrf.safe_resolve(host)  # IPv6-only hosts can still complete DNS inspection.
    items = []
    if not mx or all(str(record.exchange) == "." for record in mx):
        items.append(evidence("no-mx", "dns", "No mail exchanger", "low",
                              "The registered domain advertises no mail exchanger.", "DNS MX"))
    if getattr(a, "rrset", None) is not None and a.rrset.ttl < 60:
        items.append(evidence("low-ttl", "dns", "Short address lifetime", "info",
                              f"The A record TTL is {a.rrset.ttl} seconds.", "DNS A"))
    if len(a) > 8:
        items.append(evidence("many-addresses", "dns", "Many addresses", "low",
                              f"The hostname returned {len(a)} IPv4 addresses.", "DNS A"))
    return items
