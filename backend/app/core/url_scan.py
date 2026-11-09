import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from app.analyzers import headers, intel, phishing, redirects, tls
from app.core import ssrf
from app.core.correlation import redirect_targets
from app.core.defang import display_url
from app.core.risk import score_risk
from app.models.schemas import Onchain, ScanReport


async def analyze_url(url, engine, settings, observations=None) -> ScanReport:
    host = url.host.strip("[]").rstrip(".")
    resolution = asyncio.create_task(ssrf.safe_resolve(host))
    page = asyncio.create_task(ssrf.safe_fetch(url, page=True, resolution=resolution, observations=observations))
    sources = [intel.OpenPhish(engine), intel.PhishingDatabase(engine)]
    source_notes = []
    if settings.google_safe_browsing_key and settings.google_safe_browsing_key.get_secret_value().strip():
        sources.append(intel.GoogleSafeBrowsing(settings.google_safe_browsing_key))
    else:
        source_notes.append("Google Safe Browsing is not configured")
    checks = {
        "URL structure": asyncio.to_thread(phishing.inspect_url, url),
        "DNS": phishing.dns_indicators(host),
        "RDAP": phishing.domain_age(host, observations),
        "HTTP redirects": redirects.analyze(url, page),
        "TLS": tls.analyze(url, resolution, observations),
        "Security headers": headers.analyze(page),
    }
    if url.scheme == "https":
        checks["Certificate transparency"] = tls.transparency(host)
    for source in sources:
        checks[source.name] = source.check(url, host)
    outcomes = await asyncio.gather(*checks.values(), return_exceptions=True)
    items, completed, failed, chain = [], [], [], []
    certificate, ct = None, None
    header_findings, threat_intel = [], []
    authoritative_hit = False
    for name, outcome in zip(checks, outcomes):
        if isinstance(outcome, Exception):
            ssrf.log_failure(name, outcome)
            if name == "Certificate transparency" and isinstance(outcome, ssrf.FetchFailure):
                source_notes.append(str(outcome))
            failed.append(name)
            continue
        if name == "HTTP redirects":
            findings, chain, incomplete = outcome
            items.extend(findings)
            if incomplete:
                failed.append(name)
                continue
        elif name == "TLS":
            certificate, findings = outcome
            items.extend(findings)
        elif name == "Certificate transparency":
            ct = outcome
        elif name == "Security headers":
            header_findings, findings = outcome
            items.extend(findings)
        elif isinstance(outcome, intel.SourceResult):
            threat_intel.append(outcome.entry())
            if outcome.status == "unavailable":
                failed.append(name)
                continue
            if outcome.matched:
                items.append(phishing.evidence("intel-" + name, "threat_intel", "Threat feed match",
                                               "critical" if outcome.authoritative else "medium", outcome.detail, name))
                authoritative_hit |= outcome.authoritative
        else:
            items.extend(outcome)
        completed.append(name)
    if observations is not None:
        observations.update(redirect_targets(chain))
        if resolution.done() and not resolution.cancelled() and resolution.exception() is None:
            observations.update(("ip", str(ip)) for ip in resolution.result())
    if certificate:
        if ct is not None:
            certificate.ct_records_count, certificate.ct_notes = ct
        else:
            certificate.ct_records_count = -1  # Unknown; contract requires an integer.
            certificate.ct_notes.append("Certificate transparency lookup unavailable; count unknown.")
    risk = score_risk(items, completed, failed, authoritative_hit=authoritative_hit)
    limitations = ["Passive checks only. Header findings describe the final response; TLS describes the input host.",
                   "Certificate validity does not prove the site is trustworthy.",
                   "Threat feeds do not cover every malicious site."]
    limitations.extend(source_notes)
    if failed:
        limitations.append("Incomplete checks: " + ", ".join(failed) + ".")
    if risk.classification == "low_risk":
        limitations.append("No significant indicators found in the available checks.")
    return ScanReport(id=uuid4(), created_at=datetime.now(UTC), input_type="url",
                      input_display=display_url(url), domain=host, risk=risk, indicators=items,
                      redirect_chain=chain, tls=certificate, security_headers=header_findings, threat_intel=threat_intel,
                      ai_explanation=None, message_analysis=None,
                      precautions=["Verify the destination independently before sharing credentials or payments.",
                                   "Check warnings and incomplete sources before relying on the report."],
                      limitations=limitations, onchain=Onchain(status="not_published", report_hash=None,
                      tx_hash=None, chain_report_id=None, network=None, contract_address=None))
