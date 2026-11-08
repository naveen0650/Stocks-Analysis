"""Analytics & AI insight endpoints (Phase 1 scope)."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _month_start(today: date) -> date:
    return today.replace(day=1)


@router.get("/dashboard")
def dashboard(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    return analytics_service.dashboard(db, user.id)


@router.get("/summary")
def summary(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    end = date_to or date.today()
    start = date_from or end.replace(day=1)
    return analytics_service.summary(db, user.id, start, end)


@router.get("/trends")
def trends(
    months: int = Query(default=12, ge=2, le=24),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return analytics_service.trends(db, user.id, months)


@router.get("/categories")
def categories(
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    end = date_to or date.today()
    start = date_from or _month_start(end)
    return analytics_service.categories(db, user_id=user.id, date_from=start, date_to=end)


@router.get("/anomalies")
def anomalies(
    days: int = Query(default=90, ge=14, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return analytics_service.anomalies(db, user.id, days)


@router.get("/insights")
def insights(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    return analytics_service.insights_payload(db, user.id)


@router.get("/health-score")
def health_score(
    window_days: int = Query(default=90, ge=14, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return analytics_service.health_score(db, user.id, window_days)
