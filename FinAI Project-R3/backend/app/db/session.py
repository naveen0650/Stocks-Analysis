"""Database engine and session management.

All timestamps are stored as naive UTC (helper `utcnow`); the API documents
this and the frontend renders them as UTC.
"""

from collections.abc import Generator
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


_settings = get_settings()
_connect_args = (
    {"check_same_thread": False}
    if _settings.DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    _settings.DATABASE_URL, connect_args=_connect_args, pool_pre_ping=True
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
