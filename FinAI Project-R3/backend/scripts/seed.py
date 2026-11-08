"""Seed the database with system categories and an initial admin account.

Usage (from backend/):
    python scripts/seed.py                     # categories + admin from env
    ADMIN_EMAIL=... ADMIN_PASSWORD=... python scripts/seed.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.disclaimer import current_disclaimer  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal, engine, Base  # noqa: E402
from app.models.user import DisclaimerAcceptance, Role, User  # noqa: E402
from app.services.expense_service import ensure_system_categories  # noqa: E402

DEFAULT_ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@finai.local")
DEFAULT_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")


def create_schema() -> None:
    from app import models  # noqa: F401  (register mappers)

    Base.metadata.create_all(bind=engine)


def seed_admin(db) -> None:
    existing = db.query(User).filter(User.role == Role.admin).first()
    if existing:
        print(f"Admin already exists: {existing.email}")
        return
    admin = User(
        email=DEFAULT_ADMIN_EMAIL,
        password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
        full_name="Platform Admin",
        role=Role.admin,
    )
    db.add(admin)
    db.flush()
    # The disclaimer gate applies to every login; record acceptance for the
    # seeded admin so the account is usable immediately (versioned, audited).
    db.add(
        DisclaimerAcceptance(
            user_id=admin.id,
            version=current_disclaimer()["version"],
            ip_address="seed",
        )
    )
    db.commit()
    print(f"Created admin: {DEFAULT_ADMIN_EMAIL}")
    print(f"Default password: {DEFAULT_ADMIN_PASSWORD}  (change after first login)")


def main() -> None:
    create_schema()
    db = SessionLocal()
    try:
        ensure_system_categories(db)
        print("System categories ensured.")
        seed_admin(db)
    finally:
        db.close()
    print("Seed complete.")


if __name__ == "__main__":
    main()
