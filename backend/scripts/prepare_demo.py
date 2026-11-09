"""Prepare the local demonstration. Run from backend with python -m scripts.prepare_demo."""
import asyncio
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
import subprocess
import sys
from time import monotonic, sleep

import httpx
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.analyzers.intel import OPENPHISH, OpenPhish, digest
from app.core.config import Settings
from app.core.correlation import correlations
from app.core.db import open_database
from app.core.ssrf import BlockedTarget, validate_url
from app.models.orm import FeedSnapshot, ReportRow
from app.web3.registry import Registry, publish, verify
from scripts.reseed_chain_receipts import reseed
from scripts.seed import seed

ROOT = Path(__file__).resolve().parents[1]
API = "http://127.0.0.1:8001/api/v1/"
START_CHAIN = r"$env:CHAIN_MODE = 'local'; .\scripts\start_local_chain.ps1"
KYC = "SBI KYC update required immediately or your account will be blocked. Verify at hxxps://sbi-secure-login[.]invalid/kyc."
FRIEND = "Are you free for lunch on Saturday?"
MAX_AGE = timedelta(hours=6)


class DemoFailure(Exception):
    """Only fixed, public diagnostics may be printed."""


def check(ok, label, detail):
    print(f"{'PASS' if ok else 'FAIL'} {label} | {detail}", flush=True)


def cache_info(engine, now):
    with Session(engine) as db:
        row = db.get(FeedSnapshot, OPENPHISH)
        if row is None:
            return set(), None
        timestamp = row.refreshed_at
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=UTC)
        return set(row.entries.get("urls", [])), now - timestamp


def fresh(hashes, age):
    return bool(hashes) and age is not None and timedelta(0) <= age < MAX_AGE


def describe_cache(hashes, age):
    elapsed = "unknown" if age is None else f"{age.total_seconds() / 3600:.2f} h"
    return f"{len(hashes)} entries, age {elapsed}"


async def feed_sample(engine):
    source = OpenPhish(engine)
    now = datetime.now(UTC)
    hashes, age = cache_info(engine, now)
    try:
        # The cache contains digests only. Recover an exact preimage from the
        # publisher's fixed feed URL without connecting to any listed site.
        feed = await source.download_urls()
    except Exception:
        check(fresh(hashes, age), "OpenPhish cache", describe_cache(hashes, age))
        raise DemoFailure("OpenPhish publisher unavailable; cannot recover a sample.") from None
    if not fresh(hashes, age) or not any(digest(str(url).partition("#")[0]) in hashes for url in feed):
        source.store(feed, now)
    hashes, age = cache_info(engine, datetime.now(UTC))
    ready = fresh(hashes, age)
    check(ready, "OpenPhish cache", describe_cache(hashes, age))
    if ready:
        for url in feed:
            if digest(str(url).partition("#")[0]) not in hashes:
                continue
            try:
                return str(validate_url(url))
            except BlockedTarget:
                continue
    raise DemoFailure("No eligible cached OpenPhish URL.")


def registry_address(settings):
    if settings.chain_mode != "local":
        raise DemoFailure("CHAIN_MODE must be local.")
    registry = Registry(settings)
    registry.contract.functions.getReportCount().call()
    return registry.address


def prepare_fixtures(engine, settings, address):
    with Session(engine) as db:
        ids = seed(db)
        reseed(db, settings, ids=ids, local_registry=address)
        first = db.get(ReportRow, ids[0])
        if first.receipt and first.receipt["onchain"]["network"] != "local":
            raise DemoFailure("First fixture belongs to a different network.")
        publish(db, first, settings)
        for fixture_id in ids:
            row = db.get(ReportRow, fixture_id)
            if row.receipt:
                result = verify(row, settings)
                if not result.match or result.contract_address != address:
                    raise DemoFailure("Seeded receipt failed verification.")
        if fixture_clusters(correlations(db).model_dump(mode="json"), ids) < 2:
            raise DemoFailure("Seeded correlation clusters missing.")
        return ids


def fixture_clusters(data, ids):
    pair = set(ids[:2])
    return len({c["indicator_type"] for c in data["clusters"]
                if c["indicator_type"] in {"cert_fingerprint", "redirect_target"} and pair <= set(c["report_ids"])})


def healthy(client):
    try:
        response = client.get("health", timeout=2)
    except (httpx.ConnectError, httpx.ConnectTimeout):
        return False
    if response.status_code != 200 or response.json().get("service") != "threat-intel-backend":
        raise DemoFailure("Port 8001 is occupied by another service.")
    return True


@contextmanager
def running_api(client):
    if healthy(client):
        yield
        return
    process = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1",
                                "--port", "8001", "--no-access-log"], cwd=ROOT,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline = monotonic() + 25
        while process.poll() is None and monotonic() < deadline:
            if healthy(client):
                yield
                return
            sleep(0.25)
        raise DemoFailure("Temporary API failed to start on port 8001.")
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


def api_request(client, method, path, **kwargs):
    response = client.request(method, path, **kwargs)
    if response.status_code == 429:
        sleep(61)
        response = client.request(method, path, **kwargs)
    return response


def smoke(client, sample, ids, address):
    def verified(report_id):
        response = api_request(client, "GET", f"reports/{report_id}/verify")
        response.raise_for_status()
        data = response.json()
        return (data["match"] is True and data["network"] == "local" and data["contract_address"] == address)

    # Verify the seed before any write via a reused API, including publication.
    if not verified(ids[0]):
        raise DemoFailure("Port 8001 must use the prepared database and local registry.")
    print("input | class | score | confidence | checks_failed | seconds", flush=True)
    success = True

    def trial(label, operation):
        nonlocal success
        start = monotonic()
        try:
            verdict, score, confidence, failed, ok = operation()
        except httpx.HTTPStatusError as exc:
            verdict, score, confidence, failed, ok = f"HTTP {exc.response.status_code}", "-", "-", "-", False
        except Exception:
            verdict, score, confidence, failed, ok = "error", "-", "-", "-", False
        success &= ok
        print(f"{label} | {verdict}{'' if ok else ' FAIL'} | {score} | {confidence} | {failed} | {monotonic()-start:.2f}",
              flush=True)

    friend_id = None

    def scan(kind, value, allowed):
        nonlocal friend_id
        response = api_request(client, "POST", "scan/" + kind, json={kind: value})
        response.raise_for_status()
        report = response.json()
        if value == FRIEND:
            friend_id = report["id"]
        risk = report["risk"]
        verdict = risk["classification"]
        ok = verdict in allowed
        if kind == "url" and value == sample:
            ok = ok and any(hit["source"] == OPENPHISH and hit["matched"] for hit in report["threat_intel"])
        return verdict, risk["score"], f"{risk['confidence']:.2f}", ", ".join(risk["checks_failed"]) or "-", ok

    for label, kind, value, allowed in [
        ("github.com", "url", "https://github.com", {"low_risk"}),
        ("www.google.com", "url", "https://www.google.com", {"low_risk"}),
        ("paypa1.com", "url", "https://paypa1.com", {"suspicious", "high_risk", "confirmed_malicious"}),
        ("Cached OpenPhish entry", "url", sample, {"confirmed_malicious"}),
        ("KYC SMS", "message", KYC, {"suspicious", "high_risk", "confirmed_malicious"}),
        ("Friend message", "message", FRIEND, {"low_risk"}),
    ]:
        trial(label, lambda: scan(kind, value, allowed))

    def loopback():
        response = api_request(client, "POST", "scan/url", json={"url": "http://127.0.0.1"})
        ok = response.status_code == 422 and response.json()["error"]["code"] == "validation_error"
        return f"HTTP {response.status_code}", "-", "-", "-", ok

    def publish_friend():
        if not friend_id:
            raise DemoFailure("Friend report missing.")
        response = api_request(client, "POST", f"reports/{friend_id}/publish")
        response.raise_for_status()
        state = response.json()["onchain"]
        ok = state["status"] == "published" and state["contract_address"] == address and bool(state["tx_hash"])
        return state["status"], "-", "-", "-", ok

    def verify_friend():
        match = friend_id is not None and verified(friend_id)
        return f"match={str(match).lower()}", "-", "-", "-", match

    def clusters():
        response = api_request(client, "GET", "intel/correlations")
        response.raise_for_status()
        data = response.json()
        return f"{len(data['clusters'])} clusters", "-", "-", "-", fixture_clusters(data, ids) >= 2

    trial("http://127.0.0.1", loopback)
    trial("Publish friend report", publish_friend)
    trial("Verify friend report", verify_friend)
    trial("List correlations", clusters)
    return success


def main():
    engine = None
    try:
        settings = Settings()
        try:
            address = registry_address(settings)
            check(True, "Local chain and deployed registry", address)
        except Exception:
            address = None
            check(False, "Local chain and deployed registry", "From backend run " + START_CHAIN)
        for field in ("google_safe_browsing_key", "anthropic_api_key", "openai_api_key", "gemini_api_key",
                      "deployer_private_key"):
            key = getattr(settings, field)
            configured = key is not None and bool(key.get_secret_value().strip())
            check(True, field.upper() + " (optional)", "configured" if configured else "not configured")
        try:
            engine = open_database(settings.database_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            check(True, "Database", "reachable")
        except Exception:
            check(False, "Database", "connection or initialization failed")
            check(False, "OpenPhish cache", "database unavailable")
            return 1
        sample = asyncio.run(feed_sample(engine))
        if address is None:
            return 1
        ids = prepare_fixtures(engine, settings, address)
        check(True, "Seed", f"{len(ids)} fixtures, both seeded clusters present, local receipts verified")
        with httpx.Client(base_url=API, trust_env=False, timeout=180) as client, running_api(client):
            return 0 if smoke(client, sample, ids, address) else 1
    except DemoFailure as exc:
        check(False, "Demo", str(exc))
    except Exception as exc:
        # Database URLs, RPC payloads, tokens and raw feed URLs must stay out of output.
        check(False, "Demo", type(exc).__name__)
    finally:
        if engine is not None:
            engine.dispose()
    return 1


if __name__ == "__main__":
    sys.exit(main())
