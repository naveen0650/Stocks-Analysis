"""Identity, sessions, disclaimer acceptance and password-reset entities."""

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, utcnow


class Role(str, enum.Enum):
    user = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    mobile: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120), default="")
    role: Mapped[Role] = mapped_column(Enum(Role, native_enum=False), default=Role.user)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    failed_login_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    sessions: Mapped[list["SessionToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    disclaimer_acceptances: Mapped[list["DisclaimerAcceptance"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def display_name(self) -> str:
        return self.full_name or self.email or self.mobile or f"user-{self.id}"


class SessionToken(Base):
    """A persistent refresh-token session (stored hashed, revocable)."""

    __tablename__ = "session_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_agent: Mapped[str] = mapped_column(String(255), default="")
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped[User] = relationship(back_populates="sessions")


class DisclaimerAcceptance(Base):
    __tablename__ = "disclaimer_acceptances"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    version: Mapped[str] = mapped_column(String(20))
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    accepted_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="disclaimer_acceptances")


class PasswordResetToken(Base):
    """Single-use, expiring password reset token (stored hashed)."""

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    used_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
