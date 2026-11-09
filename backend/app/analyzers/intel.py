from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
import json
import re
from urllib.parse import urlsplit, urlunsplit
from abc import ABC, abstractmethod
from typing import Literal

from pydantic import HttpUrl
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.analyzers.phishing import shared_platform
from app.core import ssrf
from app.models.orm import FeedSnapshot
from app.models.schemas import IntelMatch

NO_MATCH = "No match found in this source. This does not indicate the site is safe."
OPENPHISH = "OpenPhish"
GOOGLE = "Google Safe Browsing"
FEED = "https://raw.githubusercontent.com/openphish/public_feed/main/feed.txt"


@dataclass
class SourceResult:
    source: str
    matched: bool
    detail: str
    status: Literal["ok", "unavailable"]
    authoritative: bool = False

    def entry(self):
        return IntelMatch(source=self.source, matched=self.matched, detail=self.detail)


class ThreatIntelSource(ABC):
    name: str

    async def check(self, url: HttpUrl, domain: str) -> SourceResult:
        try:
            return await self._lookup(url, domain)
        except Exception as exc:
            ssrf.log_failure(self.name, exc)
            return SourceResult(self.name, False, "Source unavailable; lookup incomplete.", "unavailable")

    @abstractmethod
    async def _lookup(self, url: HttpUrl, domain: str) -> SourceResult: ...


def digest(value):
    return sha256(value.encode()).hexdigest()


def url_digest(url):
    # Pydantic canonicalizes scheme, IDNA host and default ports. Decode only
    # RFC 3986 unreserved bytes; encoded separators and query order are significant.
    def escape(match):
        char = chr(int(match[1], 16))
        return char if re.fullmatch(r"[A-Za-z0-9._~-]", char) else match[0].upper()
    parts = urlsplit(str(url))
    path = re.sub(r"%([0-9a-fA-F]{2})", escape, parts.path).rstrip("/") or "/"
    query = re.sub(r"%([0-9a-fA-F]{2})", escape, parts.query)
    return digest(urlunsplit((parts.scheme, parts.netloc, path, query, "")))


class OpenPhish(ThreatIntelSource):
    name = OPENPHISH

    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    async def download_urls():
        result = await ssrf.safe_fetch(FEED, max_redirects=0)
        if result.failed or not result.chain or result.chain[-1].status != 200:
            raise ssrf.FetchFailure("Feed download unavailable")
        urls = [HttpUrl(line.strip()) for line in result.body.decode().splitlines()
                if line.strip() and not line.startswith("#")]
        if not urls:
            raise ssrf.FetchFailure("Empty feed")
        return urls

    async def snapshot(self, force=False):
        now = datetime.now(UTC)
        with Session(self.engine) as db:
            row = db.get(FeedSnapshot, self.name)
            if row and not force and row.entries.get("version") == 2 and now - row.refreshed_at.replace(tzinfo=UTC) < timedelta(hours=6):
                return row.entries
        return self.store(await self.download_urls(), now)

    def store(self, feed, now):
        entries = {"version": 2, "urls": sorted({url_digest(url) for url in feed}),
                   "hosts": sorted({digest(url.host.strip("[]").lower().rstrip(".")) for url in feed})}
        insert = sqlite_insert if self.engine.dialect.name == "sqlite" else postgres_insert
        stmt = insert(FeedSnapshot).values(source=self.name, refreshed_at=now, entries=entries)
        with self.engine.begin() as conn:
            conn.execute(stmt.on_conflict_do_update(index_elements=["source"],
                         set_={"refreshed_at": now, "entries": entries}, where=FeedSnapshot.refreshed_at <= now))
        return entries

    async def _lookup(self, url, domain):
        entries = await self.snapshot()
        if url_digest(url) in entries["urls"]:
            return SourceResult(self.name, True, "Exact URL listed in the phishing feed.", "ok", True)
        if not shared_platform(domain) and digest(domain) in entries["hosts"]:
            return SourceResult(self.name, True, "Hostname listed for another URL. This path is unverified.", "ok")
        return SourceResult(self.name, False, NO_MATCH, "ok")


class PhishingDatabase(OpenPhish):
    """Bounded prefix of the publisher's active URL list. No claim about the rest."""
    name = "Phishing.Database"
    endpoint = "https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-links-ACTIVE.txt"
    window = 131072

    @classmethod
    async def download_urls(cls):
        result = await ssrf.safe_fetch(cls.endpoint, max_redirects=0, byte_range=cls.window, max_bytes=cls.window)
        if result.failed or not result.chain or result.headers is None:
            raise ssrf.FetchFailure("Active list unavailable")
        body = result.body
        if result.chain[-1].status == 206:
            match = re.fullmatch(r"bytes 0-(\d+)/(\d+)", result.headers.get("content-range", ""))
            if not match or int(match[1]) + 1 != len(body):
                raise ssrf.FetchFailure("Invalid feed range")
            if len(body) < int(match[2]):
                body = body.rpartition(b"\n")[0]
        elif result.chain[-1].status != 200:
            raise ssrf.FetchFailure("Active list unavailable")
        urls = [HttpUrl(line) for line in body.decode().splitlines() if line and not line.startswith(("#", "ftp://"))]
        if not urls:
            raise ssrf.FetchFailure("Empty active list")
        return urls


class GoogleSafeBrowsing(ThreatIntelSource):
    name = GOOGLE

    def __init__(self, key):
        self.key = key

    async def _lookup(self, url, domain):
        if not self.key or not self.key.get_secret_value().strip():
            return SourceResult(self.name, False, "not configured", "unavailable")
        target = str(url).partition("#")[0]
        payload = {"client": {"clientId": "threat-intel-backend", "clientVersion": "1.0.0"},
                   "threatInfo": {"threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                                  "platformTypes": ["ANY_PLATFORM", "WINDOWS", "LINUX", "ANDROID", "OSX"],
                                  "threatEntryTypes": ["URL"], "threatEntries": [{"url": target}]}}
        result = await ssrf.safe_fetch("https://safebrowsing.googleapis.com/v4/threatMatches:find",
                                      json_body=payload, api_key=self.key)
        if result.failed or not result.chain or result.chain[-1].status != 200:
            raise ssrf.FetchFailure("Lookup unavailable")
        body = json.loads(result.body)
        if body == {} or body == {"matches": []}:
            return SourceResult(self.name, False, NO_MATCH, "ok")
        if not isinstance(body.get("matches"), list) or not any(
                m.get("threat", {}).get("url") == target for m in body["matches"]):
            raise ssrf.FetchFailure("Unexpected lookup response")
        return SourceResult(self.name, True, "Submitted URL matched a Google threat list.", "ok", True)
