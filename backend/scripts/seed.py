from datetime import UTC, datetime, timedelta
from hashlib import sha256
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy.orm import Session

from app.api.routes_scan import build_report
from app.analyzers.intel import NO_MATCH
from app.analyzers.tls import DISCLAIMER
from app.core.correlation import index_values
from app.core.config import Settings
from app.core.db import insert_report, open_database
from app.web3.registry import ChainUnavailable, publish
from app.models.orm import ReportRow
from app.models.schemas import IntelMatch, MessageInput, Redirect, SecurityHeader, TLS, UrlInput


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
        MessageInput(message="Pay a processing fee to receive your job offer."),
    ]
    ids = []
    for index, sample in enumerate(samples):
        fixture_id = uuid5(NAMESPACE_URL, f"threat-intel:seed:{index}")
        ids.append(str(fixture_id))
        observations = set()
        if index < 2:
            observations = {("redirect_target", "review.example"),
                            ("cert_fingerprint", sha256(b"C5 synthetic training certificate").hexdigest())}
        row = db.get(ReportRow, str(fixture_id))
        if row:
            index_values(db, fixture_id, observations)
            if row.receipt:
                continue
        report = build_report(sample)
        # A fresh database produces the same synthetic report and chain digest.
        report.created_at = datetime(2025, 1, 1, tzinfo=UTC) + timedelta(seconds=index)
        if row:
            report.created_at = row.created_at
            if report.created_at.tzinfo is None:
                report.created_at = report.created_at.replace(tzinfo=UTC)
        if isinstance(sample, UrlInput):
            enrich_fixture(report, index < 2)
        report.id = fixture_id
        if index < 2:
            report.redirect_chain = [Redirect(url="hxxps://review[.]example", status=302, domain="review.example")]
            report.limitations.append("The redirect is synthetic fixture data.")
        if row:
            row.classification = report.risk.classification
            row.report = report.model_dump(mode="json")
        else:
            insert_report(db, report, observations)
    db.commit()
    return ids


def main():
    settings = Settings()
    engine = open_database(settings.database_url)
    try:
        with Session(engine) as db:
            ids = seed(db)
            if settings.chain_mode == "local":
                for index, fixture_id in enumerate(ids):
                    row = db.get(ReportRow, fixture_id)
                    if (row.receipt and row.receipt["onchain"]["network"] not in {"local", "local-stub"}
                            or index != 0 and not row.receipt):
                        continue
                    try:
                        publish(db, row, settings)
                    except ChainUnavailable:
                        break
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
