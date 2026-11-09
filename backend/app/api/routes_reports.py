from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.http import limiter
from app.core.db import get_db, read_report
from app.models.orm import ReportRow
from app.models.schemas import Classification, ReportList, ScanReport, VerifyResult
from app.web3.registry import publish, verify

router = APIRouter()


def get_row(id: UUID, db: Session = Depends(get_db)) -> ReportRow:
    row = db.get(ReportRow, str(id))
    if row is None:
        raise HTTPException(404, "Report not found.")
    return row


@router.get("/reports")
def list_reports(risk: Classification | None = None, limit: int = Query(50, ge=0),
                 offset: int = Query(0, ge=0), db: Session = Depends(get_db)) -> ReportList:
    query = select(ReportRow)
    if risk is not None:
        query = query.where(ReportRow.classification == risk)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    rows = db.scalars(query.order_by(ReportRow.created_at.desc(), ReportRow.id).offset(offset).limit(limit))
    return ReportList(items=[read_report(row) for row in rows], total=total)


@router.get("/reports/{id}")
def get_report(row: ReportRow = Depends(get_row)) -> ScanReport:
    return read_report(row)


@router.post("/reports/{id}/publish")
@limiter.limit("10/minute")
def publish_report(request: Request, id: UUID, db: Session = Depends(get_db)) -> ScanReport:
    return publish(db, get_row(id, db), request.app.state.settings)


@router.get("/reports/{id}/verify")
def verify_report(request: Request, row: ReportRow = Depends(get_row)) -> VerifyResult:
    return verify(row, request.app.state.settings)
