import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from app.analyzers import phishing, redirects
from app.core.defang import display_url
from app.core.risk import score_risk
from app.models.schemas import Onchain, ScanReport


async def analyze_url(url) -> ScanReport:
    host = url.host.strip("[]").rstrip(".")
    checks = {
        "URL structure": asyncio.to_thread(phishing.inspect_url, url),
        "DNS": phishing.dns_indicators(host),
        "RDAP": phishing.domain_age(host),
        "HTTP redirects": redirects.analyze(url),
    }
    outcomes = await asyncio.gather(*checks.values(), return_exceptions=True)
    items, completed, failed, chain = [], [], [], []
    for name, outcome in zip(checks, outcomes):
        if isinstance(outcome, Exception):
            failed.append(name)
            continue
        if name == "HTTP redirects":
            findings, chain, incomplete = outcome
            items.extend(findings)
            if incomplete:
                failed.append(name)
                continue
        else:
            items.extend(outcome)
        completed.append(name)
    risk = score_risk(items, completed, failed)
    limitations = ["URL, DNS, registration and redirect checks provide a point-in-time assessment. "
                   "Page scripts, threat feeds and TLS chain analysis are outside this scan."]
    if failed:
        limitations.append("Incomplete checks: " + ", ".join(failed) + ".")
    if risk.classification == "low_risk":
        limitations.append("No significant indicators found in the available checks.")
    return ScanReport(id=uuid4(), created_at=datetime.now(UTC), input_type="url",
                      input_display=display_url(url), domain=host, risk=risk, indicators=items,
                      redirect_chain=chain, tls=None, security_headers=[], threat_intel=[],
                      ai_explanation=None, message_analysis=None,
                      precautions=["Verify the destination independently before sharing credentials or payments."],
                      limitations=limitations, onchain=Onchain(status="not_published", report_hash=None,
                      tx_hash=None, chain_report_id=None, network=None, contract_address=None))
