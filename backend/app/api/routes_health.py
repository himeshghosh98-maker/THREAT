from fastapi import APIRouter

from app.models.schemas import Health

router = APIRouter()


@router.get("/health")
def health() -> Health:
    return Health(status="ok", service="threat-intel-backend", version="1.0.0")
