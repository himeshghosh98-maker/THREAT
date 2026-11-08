from pathlib import Path

from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.correlation import initialize_index, protect_contacts, index_values
from app.models.orm import Base, ReportRow
from app.models.schemas import Onchain, ScanReport


def open_database(database_url: str):
    url = make_url(database_url)
    if url.drivername in {"postgres", "postgresql"}:
        url = url.set(drivername="postgresql+psycopg")
    if url.get_backend_name() == "sqlite" and url.database and url.database != ":memory:":
        Path(url.database).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, hide_parameters=True)
    Base.metadata.create_all(engine)
    initialize_index(engine)
    return engine


def get_db(request: Request):
    with Session(request.app.state.engine) as db:
        yield db


def insert_report(db: Session, report: ScanReport, observations=()):
    values = set(observations) | protect_contacts(db, report)
    db.add(ReportRow(id=str(report.id), created_at=report.created_at,
                     classification=report.risk.classification, report=report.model_dump(mode="json")))
    db.flush()
    index_values(db, report.id, values)


def read_report(row: ReportRow) -> ScanReport:
    report = ScanReport.model_validate(row.report)
    if row.receipt and row.receipt["onchain"]["network"] != "local-stub":
        report.onchain = Onchain.model_validate(row.receipt["onchain"])
    return report
