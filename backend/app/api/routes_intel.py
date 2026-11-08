from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.correlation import correlations
from app.core.db import get_db
from app.models.schemas import Correlations

router = APIRouter()


@router.get("/intel/correlations")
def get_correlations(db: Session = Depends(get_db)) -> Correlations:
    return correlations(db)
