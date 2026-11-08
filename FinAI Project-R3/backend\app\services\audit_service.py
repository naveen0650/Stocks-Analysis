"""Append-only audit trail writer."""

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def record(
    db: Session,
    *,
    action: str,
    user_id: int | None = None,
    entity: str | None = None,
    entity_id: int | None = None,
    ip_address: str = "",
    user_agent: str = "",
    meta: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            user_id=user_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            ip_address=ip_address,
            user_agent=user_agent[:255],
            meta=meta,
        )
    )
    db.commit()
