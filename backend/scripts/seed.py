from uuid import NAMESPACE_URL, uuid5

from sqlalchemy.orm import Session

from app.api.routes_scan import build_report
from app.core.config import Settings
from app.core.db import insert_report, open_database
from app.models.orm import ReportRow
from app.models.schemas import MessageInput, Redirect, UrlInput


def seed(db: Session):
    samples = [
        UrlInput(url="https://account-review.zip"), UrlInput(url="https://billing-update.mov"),
        MessageInput(message="Urgent: act now to review your account."),
        UrlInput(url="https://library.example"), UrlInput(url="https://calendar.example"),
        MessageInput(message="The public library opens at nine."),
    ]
    for index, sample in enumerate(samples):
        fixture_id = uuid5(NAMESPACE_URL, f"threat-intel:seed:{index}")
        if db.get(ReportRow, str(fixture_id)):
            continue
        report = build_report(sample)
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
