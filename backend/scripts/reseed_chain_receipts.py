"""Run with python -m scripts.reseed_chain_receipts after a local registry reset."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.db import open_database, read_report
from app.models.orm import ReportRow
from app.web3.registry import ChainUnavailable, publish


def reseed(db, settings):
    if settings.chain_mode != "local":
        raise ValueError("Receipt recovery requires a local registry.")
    rows = db.scalars(select(ReportRow).where(ReportRow.receipt.is_not(None)).order_by(ReportRow.id))
    for row in rows:
        state = read_report(row).onchain
        if state.network == "local" and state.status != "not_published":
            publish(db, row, settings)


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
