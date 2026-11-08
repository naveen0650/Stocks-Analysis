"""Public meta endpoints: liveness, disclaimer."""

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.disclaimer import current_disclaimer
from app.db.session import engine
from sqlalchemy import text

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict:
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "service": get_settings().APP_NAME,
        "env": get_settings().ENV,
    }


@router.get("/config/disclaimer")
def disclaimer() -> dict:
    return current_disclaimer()
