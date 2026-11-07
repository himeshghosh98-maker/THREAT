from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analyzers.intel import correlations
from app.core.db import get_db, read_report
from app.models.orm import ReportRow
from app.models.schemas import Correlations

router = APIRouter()


@router.get("/intel/correlations")
def get_correlations(db: Session = Depends(get_db)) -> Correlations:
    return correlations([read_report(row) for row in db.scalars(select(ReportRow))])
