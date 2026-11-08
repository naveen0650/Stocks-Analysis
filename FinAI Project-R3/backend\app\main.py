"""FastAPI application factory and startup wiring."""

import logging
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.router import api_v1_router
from app.core.config import get_settings
from app.db.session import Base, engine, SessionLocal

logger = logging.getLogger("finai")


def _wait_for_database(retries: int = 30, delay_seconds: float = 1.0) -> None:
    """Block until the database accepts connections.

    Container dependencies (re)start independently — e.g. PostgreSQL's
    healthcheck can pass while the server is still initializing — so the app
    must tolerate a short window of refused connections instead of crashing.
    """
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return
        except Exception as exc:  # OperationalError and driver variants
            last_error = exc
            logger.warning(
                "Database not ready (attempt %d/%d): %s", attempt, retries, exc
            )
            time.sleep(delay_seconds)
    raise RuntimeError(f"Database unreachable after {retries} attempts") from last_error


def _add_security_headers(app: FastAPI) -> None:
    @app.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.APP_NAME} API",
        version="1.0.0-phase1",
        description=(
            "FinAI — AI-driven personal finance, investment analytics and "
            "financial intelligence platform. Phase 1: foundation & core "
            "financial management."
        ),
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    _add_security_headers(app)

    app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

    @app.on_event("startup")
    def on_startup() -> None:
        from app import models  # noqa: F401  (register all mappers)

        _wait_for_database()
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            from app.services.expense_service import ensure_system_categories

            ensure_system_categories(db)
        finally:
            db.close()
        logger.info("FinAI started in %s mode", settings.ENV)

    return app


app = create_app()
