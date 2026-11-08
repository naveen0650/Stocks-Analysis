"""Admin analytics and user management.

Least privilege: this service exposes operational metrics only — never a
user's financial records (see docs/06-security-architecture.md).
"""

from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import utcnow
from app.models.audit import AuditLog
from app.models.finance import Budget, Expense, Income
from app.models.user import Role, SessionToken, User
from app.services import audit_service

DAU_WINDOW_HOURS = 24
MAU_WINDOW_DAYS = 30


def overview(db: Session) -> dict:
    now = utcnow()
    day_ago = now - timedelta(hours=DAU_WINDOW_HOURS)
    month_ago = now - timedelta(days=MAU_WINDOW_DAYS)
    week_ago = now - timedelta(days=7)

    def count(model, *filters) -> int:
        stmt = select(func.count()).select_from(model)
        if filters:
            stmt = stmt.where(*filters)
        return db.scalar(stmt) or 0

    total_users = count(User)
    active_users = count(User, User.is_active.is_(True))
    dau = count(SessionToken, SessionToken.last_used_at >= day_ago)
    mau = count(SessionToken, SessionToken.last_used_at >= month_ago)
    new_this_week = count(User, User.created_at >= week_ago)

    failed_logins = count(
        AuditLog, AuditLog.action == "auth.login_failed", AuditLog.created_at >= day_ago
    )
    successful_logins = count(
        AuditLog, AuditLog.action == "auth.login", AuditLog.created_at >= day_ago
    )

    feature_usage = {
        "expenses_created": count(Expense),
        "incomes_created": count(Income),
        "budgets_created": count(Budget),
    }

    suspicious = failed_logins >= 10

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "new_this_week": new_this_week,
            "dau": dau,
            "mau": mau,
        },
        "activity_24h": {
            "successful_logins": successful_logins,
            "failed_logins": failed_logins,
            "suspicious": suspicious,
        },
        "feature_usage": feature_usage,
        "system": {
            "database": "ok",
            "disclaimer_version": _disclaimer_version(),
        },
    }


def _disclaimer_version() -> str:
    from app.core.config import get_settings

    return get_settings().DISCLAIMER_VERSION


def list_users(db: Session, search: str | None, limit: int, offset: int) -> dict:
    stmt = select(User)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(func.coalesce(User.email, "")).like(like)
            | func.lower(func.coalesce(User.mobile, "")).like(like)
            | func.lower(func.coalesce(User.full_name, "")).like(like)
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    users = db.scalars(stmt.order_by(User.id).offset(offset).limit(limit)).all()

    rows = []
    for u in users:
        expense_count = db.scalar(
            select(func.count())
            .select_from(Expense)
            .where(Expense.user_id == u.id, Expense.is_deleted.is_(False))
        ) or 0
        rows.append(
            {
                "id": u.id,
                "email": u.email,
                "mobile": u.mobile,
                "full_name": u.full_name,
                "role": u.role.value,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat(),
                "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
                "expense_count": expense_count,
            }
        )
    return {"items": rows, "total": total}


def set_user_active(admin: User, db: Session, user_id: int, is_active: bool) -> dict:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id:
        raise HTTPException(
            status_code=409, detail="You cannot deactivate your own account."
        )
    if user.role == Role.admin and not is_active:
        admins = db.scalar(
            select(func.count()).select_from(User).where(User.role == Role.admin, User.is_active.is_(True))
        ) or 0
        if admins <= 1:
            raise HTTPException(
                status_code=409, detail="Cannot deactivate the last active admin."
            )
    user.is_active = is_active
    db.commit()
    if not is_active:
        for s in db.scalars(
            select(SessionToken).where(
                SessionToken.user_id == user.id, SessionToken.revoked_at.is_(None)
            )
        ):
            s.revoked_at = utcnow()
        db.commit()
    audit_service.record(
        db,
        action="admin.user_activated" if is_active else "admin.user_deactivated",
        user_id=admin.id,
        entity="user",
        entity_id=user_id,
    )
    return {"id": user.id, "is_active": user.is_active}


def set_user_role(admin: User, db: Session, user_id: int, role: str) -> dict:
    if role not in (r.value for r in Role):
        raise HTTPException(status_code=422, detail="Unknown role.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id and role != Role.admin.value:
        raise HTTPException(
            status_code=409, detail="You cannot demote your own admin account."
        )
    user.role = Role(role)
    db.commit()
    audit_service.record(
        db,
        action="admin.role_changed",
        user_id=admin.id,
        entity="user",
        entity_id=user_id,
        meta={"new_role": role},
    )
    return {"id": user.id, "role": user.role.value}


def audit_logs(
    db: Session,
    *,
    action: str | None,
    user_id: int | None,
    limit: int,
    offset: int,
) -> dict:
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if user_id is not None:
        stmt = stmt.where(AuditLog.user_id == user_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    logs = db.scalars(
        stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    ).all()
    items = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "entity": log.entity,
            "entity_id": log.entity_id,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat(),
            "meta": log.meta,
        }
        for log in logs
    ]
    return {"items": items, "total": total}


def login_activity(db: Session, days: int = 14) -> dict:
    start = utcnow() - timedelta(days=days)
    day_expr = (
        func.strftime("%Y-%m-%d", AuditLog.created_at)
        if db.bind.dialect.name == "sqlite"
        else func.date(AuditLog.created_at)
    )
    rows = db.execute(
        select(
            AuditLog.action,
            day_expr,
            func.count(),
        )
        .where(
            AuditLog.action.in_(["auth.login", "auth.login_failed"]),
            AuditLog.created_at >= start,
        )
        .group_by(AuditLog.action, day_expr)
    ).all()
    by_day: dict[str, dict[str, int]] = {}
    for action, day, cnt in rows:
        day_str = str(day)
        by_day.setdefault(day_str, {"success": 0, "failed": 0})
        by_day[day_str]["success" if action == "auth.login" else "failed"] = cnt
    series = [
        {"date": d, **by_day[d]} for d in sorted(by_day)
    ]
    return {"days": days, "series": series}
