"""Run real scan endpoints with a disposable DB and write an observed Markdown report."""
import json
from datetime import UTC, datetime
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient

from app.ai.privacy import redact
from app.core.config import Settings
from app.main import create_app
from app.models.schemas import ScanReport

ROOT = Path(__file__).resolve().parents[1]


def cases():
    fixtures = ROOT / "tests/fixtures"
    for case in json.loads((fixtures / "urls.json").read_text()):
        yield "url", case["label"], case["url"], case["suspicious"]
    for case in json.loads((fixtures / "messages.json").read_text()):
        yield "message", case["label"], case["message"], case["indicator"] is not None


def interpretation(report, suspicious):
    if report.risk.classification == "inconclusive":
        return "Inconclusive; insufficient coverage."
    flagged = report.risk.classification != "low_risk"
    if suspicious and not flagged:
        return "Potential false negative against the fixture expectation."
    if not suspicious and flagged:
        return "Potential false positive on this benign reference."
    return "Consistent with fixture expectation."


def run():
    timestamp = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    rows = []
    with TemporaryDirectory() as tmp:
        settings = Settings(database_url=f"sqlite:///{Path(tmp) / 'demo.sqlite'}")
        with TestClient(create_app(settings), raise_server_exceptions=False) as client:
            for kind, label, value, suspicious in cases():
                response = client.post(f"/api/v1/scan/{kind}", json={kind: value})
                preview = redact(value, settings.sensitive_values)
                if response.status_code != 200:
                    row = [label, preview, "Skipped", "-", "-", "-", f"HTTP {response.status_code}", "Scan failed."]
                else:
                    report = ScanReport.model_validate(response.json())
                    row = [label, preview, report.risk.classification, report.risk.score,
                           report.risk.confidence, ", ".join(i.id for i in report.indicators) or "None",
                           ", ".join(report.risk.checks_failed) or "None", interpretation(report, suspicious)]
                rows.append("| " + " | ".join(str(v).replace("|", "&#124;").replace("\n", " ") for v in row) + " |")
    report_file = ROOT / "docs/TESTING_REPORT.md"
    report_file.parent.mkdir(exist_ok=True)
    report_file.write_text(f"""# Demo testing report

Run at {timestamp} through the FastAPI scan endpoints with live analyzers and a disposable database. Inputs include three suspicious URLs, four benign reference URLs and six messages. Network and provider failures appear in the failed-checks column. A missing Google key is an unavailable source. URL previews show defanged origins and omit paths and query strings.

| Case | Input preview | Classification | Score | Confidence | Indicator IDs | Failed checks | Interpretation |
|---|---|---|---:|---:|---|---|---|
""" + "\n".join(rows) + """

## Known limitations

The suspicious URL fixtures use reserved names and deliberately have no real malicious site behind them. Their DNS, redirect, registration and TLS results cannot demonstrate live attack detection. The benign sites are references, not independently labelled ground truth. Shared infrastructure, header omissions and short DNS lifetimes can flag benign sites. A missing source reduces coverage; confidence is the fraction of checks completed, not a probability of maliciousness. These cases do not estimate a production false-positive or false-negative rate.
""", encoding="utf-8")
    print(f"Wrote {len(rows)} cases to {report_file.name}.")


if __name__ == "__main__":
    run()
