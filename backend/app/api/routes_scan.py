from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.ai.explain import explain
from app.ai.message import analyze_message
from app.analyzers.phishing import inspect_url
from app.core.db import get_db, insert_report
from app.core.defang import display_url
from app.core.risk import assess
from app.core.ssrf import BlockedTarget, validate_url
from app.core.url_scan import analyze_url
from app.models.schemas import MessageInput, Onchain, ScanReport, UrlInput

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def build_report(payload: UrlInput | MessageInput) -> ScanReport:
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
        display = "[message content withheld]"
        analysis, indicators = analyze_message(payload.message)
        check = "Local urgency phrases"
    risk = assess(indicators, check)
    explanation = explain(risk, indicators)
    return ScanReport(id=uuid4(), created_at=datetime.now(UTC), input_type=input_type,
                      input_display=display, domain=domain, risk=risk, indicators=indicators,
                      redirect_chain=[], tls=None, security_headers=[], threat_intel=[],
                      ai_explanation=explanation, message_analysis=analysis,
                      precautions=explanation.recommended_actions,
                      limitations=["C0 stub uses a local rule. No live DNS, TLS, headers, redirects or intelligence feeds were checked."],
                      onchain=Onchain(status="not_published", report_hash=None, tx_hash=None,
                                      chain_report_id=None, network=None, contract_address=None))


def save_scan(db: Session, payload: UrlInput | MessageInput) -> ScanReport:
    report = build_report(payload)
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
    report = await analyze_url(url)
    insert_report(db, report)
    db.commit()
    return report


@router.post("/scan/message")
def scan_message(payload: MessageInput, db: Session = Depends(get_db)) -> ScanReport:
    return save_scan(db, payload)
