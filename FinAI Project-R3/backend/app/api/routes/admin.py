"""Admin endpoints — require the admin role; expose operational data only."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.db.session import get_db
from app.models.user import User
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class UserAdminPatch(BaseModel):
    is_active: bool | None = None
    role: str | None = None


@router.get("/overview")
def overview(db: Session = Depends(get_db)) -> dict:
    return admin_service.overview(db)


@router.get("/users")
def list_users(
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    return admin_service.list_users(db, search=search, limit=limit, offset=offset)


@router.patch("/users/{user_id}")
def patch_user(
    user_id: int,
    payload: UserAdminPatch,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    result: dict = {"id": user_id}
    if payload.is_active is not None:
        result.update(admin_service.set_user_active(admin, db, user_id, payload.is_active))
    if payload.role is not None:
        result.update(admin_service.set_user_role(admin, db, user_id, payload.role))
    return result


@router.get("/audit-logs")
def audit_logs(
    action: str | None = Query(default=None, max_length=60),
    user_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    return admin_service.audit_logs(
        db, action=action, user_id=user_id, limit=limit, offset=offset
    )


@router.get("/login-activity")
def login_activity(
    days: int = Query(default=14, ge=1, le=90),
    db: Session = Depends(get_db),
) -> dict:
    return admin_service.login_activity(db, days)
