import asyncio
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.ai.explain import explain, explain_report
from app.ai.message import analyze_message, extract_links
from app.ai.privacy import redact
from app.analyzers.phishing import inspect_url
from app.core.db import get_db, insert_report
from app.core.defang import display_url
from app.core.risk import assess, score_risk
from app.core.ssrf import BlockedTarget, validate_url
from app.core.url_scan import analyze_url
from app.models.schemas import MessageInput, Onchain, ScanReport, UrlInput

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def build_report(payload: UrlInput | MessageInput, keys=()) -> ScanReport:
    analysis = None
    domain = None
    if isinstance(payload, UrlInput):
        input_type = "url"
        domain = payload.url.host
        display = display_url(payload.url)
        indicators = inspect_url(payload.url)
        check = "Local domain suffix"
    else:
        input_type = "message"
        display = redact(payload.message, keys)[:80]
        analysis, indicators = analyze_message(payload.message)
        check = "Local message rules"
    risk = assess(indicators, check)
    explanation = explain(risk, indicators)
    return ScanReport(id=uuid4(), created_at=datetime.now(UTC), input_type=input_type,
                      input_display=display, domain=domain, risk=risk, indicators=indicators,
                      redirect_chain=[], tls=None, security_headers=[], threat_intel=[],
                      ai_explanation=explanation, message_analysis=analysis,
                      precautions=explanation.recommended_actions,
                      limitations=["This offline assessment uses local rules only."],
                      onchain=Onchain(status="not_published", report_hash=None, tx_hash=None,
                                      chain_report_id=None, network=None, contract_address=None))


def save_scan(db: Session, report: ScanReport) -> ScanReport:
    insert_report(db, report)
    db.commit()
    return report


@router.post("/scan/url")
@limiter.limit("10/minute")
async def scan_url(request: Request, payload: UrlInput, db: Session = Depends(get_db)) -> ScanReport:
    try:
        url = validate_url(payload.url)
    except BlockedTarget:
        raise HTTPException(422, "A public HTTP(S) URL on an allowed port is required.") from None
    report = await analyze_url(url, request.app.state.engine, request.app.state.settings)
    report.ai_explanation = await explain_report(report, request.app.state.settings)
    return save_scan(db, report)


@router.post("/scan/message")
@limiter.limit("10/minute")
async def scan_message(request: Request, payload: MessageInput, db: Session = Depends(get_db)) -> ScanReport:
    settings = request.app.state.settings
    report = build_report(payload, settings.sensitive_values)
    report.limitations = ["Message analysis uses local language signals. Claimed identities are unverified.",
                          "Only the first five distinct links are scanned; the report displays their defanged origins."]
    urls = extract_links(payload.message)

    async def inspect(link):
        return await analyze_url(validate_url(link), request.app.state.engine, settings)

    results = await asyncio.gather(*(inspect(link) for link in urls[:5]), return_exceptions=True)
    completed = list(report.risk.checks_completed)
    failed, linked = [], []
    for index, result in enumerate(results, 1):
        prefix = f"Link {index}: "
        if isinstance(result, Exception):
            failed.append(prefix + "URL scan blocked or unavailable")
            continue
        linked.append(result)
        report.indicators.extend(i.model_copy(update={"id": f"link-{index}-{i.id}"}) for i in result.indicators)
        completed.extend(prefix + name for name in result.risk.checks_completed)
        failed.extend(prefix + name for name in result.risk.checks_failed)
        report.threat_intel.extend(result.threat_intel)
        report.redirect_chain.extend(result.redirect_chain)
    if len(urls) > 5:
        failed.append("Additional URLs beyond the five-link limit")
    report.risk = score_risk(report.indicators, completed, failed,
                             authoritative_hit=any(link.risk.classification == "confirmed_malicious" for link in linked))
    report.ai_explanation = await explain_report(report, settings, message=payload.message, links=linked)
    report.message_analysis.explanation = report.ai_explanation.summary
    return save_scan(db, report)
