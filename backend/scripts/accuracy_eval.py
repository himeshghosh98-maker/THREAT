"""Tune only on split=tune. Freeze the detector before evaluating test. Never reassign cases."""
import argparse
from collections import Counter
from contextlib import ExitStack, contextmanager
import json
from math import sqrt
from hashlib import sha256
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import httpx
from fastapi.testclient import TestClient

from app.analyzers import phishing, tls
from app.core import ssrf
from app.core.config import Settings
from app.core.risk import BANDS
from app.main import create_app
from app.models.schemas import TLS

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests/fixtures"
POSITIVE = {"suspicious", "high_risk", "confirmed_malicious"}


@contextmanager
def replay():
    """Replay a common recorded healthy profile, with explicit NXDOMAIN and synthetic feed controls."""
    fixture = json.loads((FIXTURES / "accuracy_network.json").read_text())
    attempts = []
    class Answer(list):
        rrset = SimpleNamespace(ttl=fixture["ttl"])

    async def dns(host, kind):
        attempts.append("DNS")
        if host.endswith(".invalid"):
            return Answer()
        if kind == "MX":
            return Answer([SimpleNamespace(exchange="mail.example.")])
        return Answer(SimpleNamespace(address=a) for a in fixture["dns"] if kind == "A")

    async def certificate(url, resolution, observations):
        attempts.append("TLS")
        await resolution
        return TLS.model_validate(fixture["tls"]), []

    class Stream(httpx.AsyncByteStream):
        def __init__(self, body):
            self.body = body
        async def __aiter__(self):
            yield self.body

    async def transport(self, req):
        host = req.headers["host"]
        attempts.append(host)
        status, headers, body = fixture["status"], fixture["headers"], b""
        if host == "rdap.org":
            headers = {"content-type": "application/rdap+json"}
            body = json.dumps({"ldhName": req.url.path.split("/")[-1], "events": [
                {"eventAction": "registration", "eventDate": fixture["registration"]}]}).encode()
        elif host == "crt.sh":
            headers, body = {"content-type": "application/json"}, json.dumps(fixture["ct"]).encode()
        elif host == "raw.githubusercontent.com":
            feed = fixture["feed"] if "openphish" in req.url.path else ["https://independent-control.example/login"]
            headers, body = {"content-type": "text/plain"}, "\n".join(feed).encode()
        return httpx.Response(status, headers=headers, stream=Stream(body))

    with ExitStack() as stack:
        if hasattr(tls, "_CT_CACHE"):
            stack.enter_context(patch.object(tls, "_CT_CACHE", tls._CT_CACHE.copy()))
            tls._CT_CACHE.clear()
        stack.enter_context(patch.object(ssrf, "dns_answer", dns))
        stack.enter_context(patch.object(tls, "analyze", certificate))
        stack.enter_context(patch.object(httpx.AsyncHTTPTransport, "handle_async_request", transport))
        yield attempts


def evaluate(split, live=False):
    cases = json.loads((FIXTURES / "accuracy_cases.json").read_text(encoding="utf8"))
    # Frozen with the baseline at 23b63cd. Any change creates a new experiment.
    if sha256(json.dumps(cases, sort_keys=True).encode()).hexdigest() != "603c86f917516c1d31bb6f54d2e7e1b4da4b0d202bc70a7f30bc2a89d949fb6b":
        raise ValueError("Corpus differs from the recorded baseline.")
    rows = []
    with TemporaryDirectory() as directory, ExitStack() as stack:
        attempts = [] if live else stack.enter_context(replay())
        settings = Settings(_env_file=".env" if live else None, database_url=f"sqlite:///{directory}/eval.db",
                            anthropic_api_key=None, openai_api_key=None, gemini_api_key=None,
                            google_safe_browsing_key=Settings().google_safe_browsing_key if live else None)
        app = create_app(settings)
        client = stack.enter_context(TestClient(app))
        for case in cases:
            if split != "all" and case["split"] != split:
                continue
            kind = "message" if case["category"] in {"scam", "benign_message"} else "url"
            observed = []
            start = len(attempts)
            for _ in range(2):
                app.state.limiter.reset()
                response = client.post("/api/v1/scan/" + kind, json={kind: case["input"]})
                if response.status_code == 422:
                    observed.append(("rejected", None, []))
                    continue
                response.raise_for_status()
                report = response.json()
                observed.append((report["risk"]["classification"], report["risk"]["score"],
                                 [i["id"] for i in report["indicators"]]))
            verdict, score, ids = observed[0]
            expected = case["expected"]
            # Rejecting a phishing URL containing userinfo is a protective outcome.
            correct = verdict == expected or expected == "positive" and verdict in POSITIVE | {"rejected"}
            if case["category"] == "attack" and len(attempts) != start:
                correct = False
            rows.append(dict(case, verdict=verdict, score=score, indicators=ids, correct=correct,
                             deterministic=observed[0] == observed[1],
                             band=score is None or BANDS[verdict][0] <= score <= BANDS[verdict][1]))
    return rows


def rates(rows):
    benign = [r for r in rows if r["expected"] == "low_risk"]
    threats = [r for r in rows if r["expected"] == "positive"]
    attacks = [r for r in rows if r["expected"] == "rejected"]
    return {"FPR": (sum(r["verdict"] in POSITIVE | {"rejected"} for r in benign), len(benign)),
            "FNR": (sum(not r["correct"] for r in threats), len(threats)),
            "attack rejection": (sum(r["correct"] for r in attacks), len(attacks)),
            "inconclusive": (sum(r["verdict"] == "inconclusive" for r in rows), len(rows))}


def interval(n, total):
    if not total:
        return "n/a"
    p, z = n / total, 1.959964
    d = 1 + z*z/total
    center = (p + z*z/(2*total))/d
    spread = z*sqrt(p*(1-p)/total + z*z/(4*total*total))/d
    return f"{n}/{total} ({100*p:.1f}%, 95% CI {100*max(0,center-spread):.1f}–{100*min(1,center+spread):.1f}%)"


def report(rows, *, live=False):
    lines = ["# Accuracy evaluation", "",
             "Tune only on the tune split. Freeze weights, thresholds, keyword lists and brands before opening test results. Never move cases between splits.",
             "", "Offline replay uses a sanitized GitHub DNS, TLS, HTTP and RDAP profile shared across reachable hosts, synthetic no-answer and feed controls, and empty CT records. Labels describe intended URL style or message content. These are controlled cases, not a prevalence sample or proof that a live domain hosts phishing.",
             "", "Baseline revision: 23b63cd. The old detector was scored on both splits before edits. Only tune metrics were inspected during development. The gate generated this report after the rules were frozen.",
             "", "Positive means suspicious or higher. Rejection is protective on phishing inputs. Inconclusive counts as a miss on positive inputs. Attack rejection requires HTTP 422 and zero outbound HTTP attempts in replay. Intervals are Wilson score intervals.", ""]
    if live:
        lines[4] = "Live evaluation uses the configured network and feed snapshots; changing coverage can affect repeated runs."
    baseline = json.loads((FIXTURES / "accuracy_baseline.json").read_text())
    for split in ("tune", "test"):
        subset = [r for r in rows if r["split"] == split]
        if not subset:
            continue
        lines += [f"## {split} ({len(subset)} cases)", "", "| Metric | Baseline | Final |", "|---|---|---|"]
        for name, pair in rates(subset).items():
            lines.append(f"| {name} | {interval(*baseline[split][name])} | {interval(*pair)} |")
        lines += ["", "| Category | Cases | Errors | FPR | FNR | Attack rejection | Inconclusive |", "|---|---:|---:|---|---|---|---|"]
        for category in sorted({r["category"] for r in subset}):
            group = [r for r in subset if r["category"] == category]
            cells = " | ".join(interval(*pair) for pair in rates(group).values())
            lines.append(f"| {category} | {len(group)} | {sum(not r['correct'] for r in group)} | {cells} |")
        predictions = ["low_risk", "suspicious", "high_risk", "confirmed_malicious", "inconclusive", "rejected"]
        lines += ["", "| Expected / observed | " + " | ".join(predictions) + " |", "|---|" + "---:|"*len(predictions)]
        for truth in sorted({r["expected"] for r in subset}):
            counts = Counter(r["verdict"] for r in subset if r["expected"] == truth)
            lines.append("| " + truth + " | " + " | ".join(str(counts[p]) for p in predictions) + " |")
        lines += ["", f"Deterministic {sum(r['deterministic'] for r in subset)}/{len(subset)}. In band or rejected {sum(r['band'] for r in subset)}/{len(subset)}.", "",
                  "| Error | Input | Expected | Observed | Indicator IDs |", "|---|---|---|---|---|"]
        for r in subset:
            if not r["correct"]:
                lines.append(f"| {r['id']} | `{r['input']}` | {r['expected']} | {r['verdict']} | {', '.join(r['indicators']) or 'none'} |")
    (ROOT / "docs/ACCURACY_REPORT.md").write_text("\n".join(lines)+"\n", encoding="utf8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--split", choices=["tune", "test", "all"], default="tune")
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--report", action="store_true")
    args = parser.parse_args()
    rows = evaluate(args.split, args.live)
    print(rates(rows))
    if args.report:
        report(rows, live=args.live)


if __name__ == "__main__":
    main()
