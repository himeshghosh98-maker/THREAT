import asyncio
import json
import re
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
BRANDS = json.loads((DATA / "brands.json").read_text())["brands"]
TLDS = set(json.loads((DATA / "suspicious_tlds.json").read_text()))
# Use the bundled PSL, with no HTTP updates or shared disk cache.
extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None, include_psl_private_domains=True)
CONFUSABLES = str.maketrans("аеорсхуіјӏαρο", "aeopcxyijlapo")


CREDENTIAL_WORDS = ("login", "secure", "verify", "update", "kyc", "account", "refund", "support")
MIN_FUZZY_LENGTH = 5
MAX_BRAND_EDITS = 1
PLATFORMS = {"github.io", "pages.dev", "vercel.app", "netlify.app", "web.app",
             "blogspot.com", "wordpress.com", "firebaseapp.com", "githubusercontent.com"}


def shared_platform(host):
    return extract(host).is_private or any(host == p or host.endswith("." + p) for p in PLATFORMS)


def brand_aliases():
    return (alias for brand in BRANDS.values() for alias in brand["aliases"])


BRAND_TOKENS = tuple(dict.fromkeys(alias.replace(" ", "") for alias in brand_aliases()))
OWNED_LABELS = {extract(host).domain for brand in BRANDS.values() for host in brand["owned_domains"]}


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
                   for brand in BRANDS.values() for domain in brand["owned_domains"])
    credential = any(word in domain_label or word in (url.path or "").lower() for word in CREDENTIAL_WORDS)
    aliases = BRAND_TOKENS
    platform = shared_platform(host)
    if not official and not platform:
        tokens = domain_label.split("-")
        if domain_label in aliases or domain_label in OWNED_LABELS:
            flag("brand-other-suffix", "Brand label on a non-owned domain",
                 "The exact label appears under a different suffix.", "low")
        else:
            for alias in aliases:
                combination = alias in tokens or (len(alias) >= 3 and alias in domain_label and credential)
                similar = len(alias) >= MIN_FUZZY_LENGTH and any(
                    Levenshtein.distance(token.translate(str.maketrans("01", "ol")), alias) <= MAX_BRAND_EDITS
                    for token in tokens)
                if similar or combination:
                    flag("brand-lookalike", "Brand-like domain label",
                         f"The registered label resembles {alias}.", "high", "typosquat")
                    break
        if set(re.split(r"[.-]", parts.subdomain)) & set(aliases):
            flag("brand-subdomain", "Brand in subdomain", "A brand appears outside the registered domain.")
        path_words = set(re.findall(r"[a-z0-9]+", (url.path or "").lower()))
        if path_words.intersection(aliases) and path_words.intersection(CREDENTIAL_WORDS):
            flag("brand-path", "Brand and credential terms in path", "The external path combines a brand and a credential term.")
    if not official and not platform and any(label.startswith("xn--") for label in host.split(".")):
        flag("idn-label", "Internationalized domain label", "The host includes a punycode label.", "low", "homograph")
        for label in host.split("."):
            if not label.startswith("xn--"):
                continue
            decoded = idna.decode(label)
            folded = unicodedata.normalize("NFKD", decoded.translate(CONFUSABLES))
            skeleton = "".join(c for c in folded if not unicodedata.combining(c)).casefold()
            if skeleton != decoded and any(token in aliases for token in skeleton.split("-")):
                flag("confusable-label", "Visually confusable label",
                     "A decoded label resembles a brand after folding known lookalikes.", "high", "homograph")
                break
    if any(i.category == "typosquat" or i.id == "confusable-label" for i in items) and (
            credential or host.split(".")[-1] in TLDS):
        flag("brand-corroboration", "Corroborating URL context",
             "A lookalike is paired with a credential term or watchlisted suffix.", "high")
    if "@" in str(url):
        flag("at-sign", "At-sign in URL", "The URL contains an at-sign.")
    try:
        ip_address(host)
    except ValueError:
        pass
    else:
        if credential:
            flag("ip-credential", "Credential terms at an IP address", "The IP URL has a credential-style path.")
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
