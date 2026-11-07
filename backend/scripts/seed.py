from datetime import timedelta
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy.orm import Session

from app.api.routes_scan import build_report
from app.analyzers.intel import NO_MATCH
from app.analyzers.tls import DISCLAIMER
from app.core.config import Settings
from app.core.db import insert_report, open_database
from app.models.orm import ReportRow
from app.models.schemas import IntelMatch, MessageInput, Redirect, ScanReport, SecurityHeader, TLS, UrlInput


def enrich_fixture(report, suspicious):
    created = report.created_at
    domain = report.domain
    report.tls = TLS(valid=True, issuer="CN=Example Training CA", subject="CN=" + domain,
                     san=[domain], not_before=created - timedelta(days=30), not_after=created + timedelta(days=60),
                     days_remaining=60, hostname_match=True, key_type="RSA", key_size=2048,
                     signature_algorithm="sha256", chain=["CN=" + domain, "CN=Example Training CA"],
                     ct_records_count=2, ct_notes=[], compromised_ca_flag=False, findings=[], disclaimer=DISCLAIMER)
    if suspicious:
        report.security_headers = [SecurityHeader(issue="Missing CSP", evidence="CSP absent from the fixture response.",
                                      severity="low", impact="Resource restrictions are absent.",
                                      remediation="Set a restrictive CSP.", limitations="One synthetic response.")]
    report.threat_intel = [IntelMatch(source="OpenPhish", matched=False, detail=NO_MATCH),
                           IntelMatch(source="Google Safe Browsing", matched=False, detail=NO_MATCH)]
    report.limitations = ["Synthetic fixture. TLS, headers and feed observations are illustrative."]


def seed(db: Session):
    samples = [
        UrlInput(url="https://account-review.zip"), UrlInput(url="https://billing-update.mov"),
        MessageInput(message="Urgent: act now to review your account."),
        UrlInput(url="https://library.example"), UrlInput(url="https://calendar.example"),
        MessageInput(message="The public library opens at nine."),
    ]
    for index, sample in enumerate(samples):
        fixture_id = uuid5(NAMESPACE_URL, f"threat-intel:seed:{index}")
        row = db.get(ReportRow, str(fixture_id))
        if row:
            if row.receipt or not isinstance(sample, UrlInput) or row.report.get("tls"):
                continue
            report = ScanReport.model_validate(row.report)
            enrich_fixture(report, index < 2)
            row.report = report.model_dump(mode="json")
            continue
        report = build_report(sample)
        if isinstance(sample, UrlInput):
            enrich_fixture(report, index < 2)
        report.id = fixture_id
        if index < 2:
            report.redirect_chain = [Redirect(url="hxxps://review[.]example", status=302, domain="review.example")]
            report.limitations.append("The redirect is synthetic fixture data.")
        insert_report(db, report)
    db.commit()


def main():
    engine = open_database(Settings().database_url)
    try:
        with Session(engine) as db:
            seed(db)
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
