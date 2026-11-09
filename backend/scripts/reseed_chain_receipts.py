"""Run with python -m scripts.reseed_chain_receipts after a local registry reset."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.db import open_database, read_report
from app.models.orm import ReportRow
from app.web3.registry import ChainUnavailable, publish


def reseed(db, settings, *, ids=None, local_registry=None):
    if settings.chain_mode != "local":
        raise ValueError("Receipt recovery requires a local registry.")
    query = select(ReportRow).where(ReportRow.receipt.is_not(None)).order_by(ReportRow.id)
    if ids is not None:
        query = query.where(ReportRow.id.in_(ids))
    rows = db.scalars(query)
    for row in rows:
        state = read_report(row).onchain
        if state.network == "local" or row.receipt["onchain"]["network"] == "local-stub":
            publish(db, row, settings, local_registry=local_registry)


def main():
    settings = Settings()
    engine = open_database(settings.database_url)
    try:
        with Session(engine) as db:
            reseed(db, settings)
    except ChainUnavailable:
        raise SystemExit("Local registry unavailable. Retry after deployment.") from None
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
