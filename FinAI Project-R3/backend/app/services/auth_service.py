"""Authentication and account orchestration."""

from datetime import timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.disclaimer import current_disclaimer
from app.core.security import (
    create_access_token,
    decode_access_token,
    digest_token,
    generate_refresh_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.db.session import utcnow
from app.models.user import (
    DisclaimerAcceptance,
    PasswordResetToken,
    Role,
    SessionToken,
    User,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdate,
    RegisterRequest,
    ResetPasswordRequest,
    SessionOut,
    TokenPair,
    UserOut,
)
from app.services import audit_service


class AuthError(HTTPException):
    def __init__(self, code: str, message: str, status_code: int = 400):
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message},
        )


def _client_meta(request: Request) -> tuple[str, str]:
    ip = request.client.host if request.client else ""
    agent = request.headers.get("user-agent", "")[:255]
    return ip, agent


def _user_has_current_disclaimer(db: Session, user: User) -> bool:
    version = current_disclaimer()["version"]
    stmt = select(DisclaimerAcceptance).where(
        DisclaimerAcceptance.user_id == user.id,
        DisclaimerAcceptance.version == version,
    )
    return db.scalar(stmt) is not None


def _issue_session(
    db: Session, user: User, ip: str, user_agent: str
) -> TokenPair:
    raw_refresh, expires_at = generate_refresh_token()
    session = SessionToken(
        user_id=user.id,
        token_hash=digest_token(raw_refresh),
        user_agent=user_agent,
        ip_address=ip,
        expires_at=expires_at,
        last_used_at=utcnow(),
    )
    db.add(session)
    db.commit()
    return TokenPair(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=raw_refresh,
        user=UserOut.model_validate(user),
    )


def _find_user_by_login(db: Session, identifier: str) -> User | None:
    ident = identifier.strip().lower()
    stmt = select(User).where((User.email == ident) | (User.mobile == ident))
    return db.scalar(stmt)


def register(payload: RegisterRequest, request: Request, db: Session) -> TokenPair:
    disclaimer = current_disclaimer()
    if payload.disclaimer_version != disclaimer["version"]:
        raise AuthError(
            "DISCLAIMER_REQUIRED",
            f"You must accept disclaimer version {disclaimer['version']}.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    email = payload.email.strip().lower() if payload.email else None
    if email and db.scalar(select(User).where(User.email == email)):
        raise AuthError("EMAIL_TAKEN", "An account with this email already exists.")
    if payload.mobile and db.scalar(
        select(User).where(User.mobile == payload.mobile)
    ):
        raise AuthError("MOBILE_TAKEN", "An account with this mobile already exists.")

    user = User(
        email=email,
        mobile=payload.mobile,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
    )
    db.add(user)
    db.flush()
    db.add(
        DisclaimerAcceptance(
            user_id=user.id,
            version=payload.disclaimer_version,
            ip_address=_client_meta(request)[0],
        )
    )
    db.commit()

    audit_service.record(
        db,
        action="user.register",
        user_id=user.id,
        ip_address=_client_meta(request)[0],
        user_agent=_client_meta(request)[1],
        meta={"email": email, "mobile": payload.mobile},
    )
    return _issue_session(db, user, *_client_meta(request))


def login(payload: LoginRequest, request: Request, db: Session) -> TokenPair:
    ip, agent = _client_meta(request)
    user = _find_user_by_login(db, payload.identifier)

    if user is not None and user.locked_until and user.locked_until > utcnow():
        raise AuthError(
            "ACCOUNT_LOCKED",
            "Too many failed attempts. Try again later.",
            status_code=status.HTTP_423_LOCKED,
        )

    if user is None or not verify_password(payload.password, user.password_hash):
        if user is not None:
            user.failed_login_count += 1
            settings = get_settings()
            if user.failed_login_count >= settings.LOGIN_MAX_FAILURES:
                user.locked_until = utcnow() + timedelta(
                    minutes=settings.LOGIN_LOCK_MINUTES
                )
                user.failed_login_count = 0
            db.commit()
        audit_service.record(
            db,
            action="auth.login_failed",
            user_id=user.id if user else None,
            ip_address=ip,
            user_agent=agent,
            meta={"identifier": payload.identifier[:64]},
        )
        raise AuthError(
            "INVALID_CREDENTIALS",
            "Incorrect credentials.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        raise AuthError(
            "ACCOUNT_DISABLED",
            "This account has been deactivated.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = utcnow()
    db.commit()

    if not _user_has_current_disclaimer(db, user):
        raise AuthError(
            "DISCLAIMER_REQUIRED",
            "A newer disclaimer version must be accepted.",
            status_code=status.HTTP_403_FORBIDDEN,
        )

    audit_service.record(
        db, action="auth.login", user_id=user.id, ip_address=ip, user_agent=agent
    )
    return _issue_session(db, user, ip, agent)


def refresh(raw_refresh_token: str, db: Session) -> TokenPair:
    """Rotate the session: the used refresh token is revoked and replaced."""
    token_hash = digest_token(raw_refresh_token)
    session = db.scalar(
        select(SessionToken).where(SessionToken.token_hash == token_hash)
    )
    now = utcnow()
    if session is None or session.revoked_at is not None or session.expires_at < now:
        raise AuthError(
            "TOKEN_EXPIRED",
            "Refresh token is invalid or expired.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise AuthError(
            "ACCOUNT_DISABLED",
            "Account is disabled.",
            status_code=status.HTTP_403_FORBIDDEN,
        )
    session.revoked_at = now
    pair = _issue_session(db, user, session.ip_address, session.user_agent)
    return pair


def logout(raw_refresh_token: str, user: User, db: Session) -> None:
    token_hash = digest_token(raw_refresh_token)
    session = db.scalar(
        select(SessionToken).where(SessionToken.token_hash == token_hash)
    )
    if session and session.user_id == user.id and session.revoked_at is None:
        session.revoked_at = utcnow()
        db.commit()


def update_profile(user: User, payload: ProfileUpdate, db: Session) -> UserOut:
    if payload.mobile is not None:
        clash = db.scalar(
            select(User).where(User.mobile == payload.mobile, User.id != user.id)
        )
        if clash:
            raise AuthError("MOBILE_TAKEN", "This mobile number is already in use.")
        user.mobile = payload.mobile
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    db.commit()
    return UserOut.model_validate(user)


def change_password(
    user: User, payload: ChangePasswordRequest, request: Request, db: Session
) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise AuthError(
            "INVALID_CREDENTIALS",
            "Current password is incorrect.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    ip, agent = _client_meta(request)
    audit_service.record(
        db, action="auth.password_changed", user_id=user.id, ip_address=ip, user_agent=agent
    )


def list_sessions(user: User, current_session_hash: str | None, db: Session) -> list[SessionOut]:
    stmt = (
        select(SessionToken)
        .where(
            SessionToken.user_id == user.id,
            SessionToken.revoked_at.is_(None),
            SessionToken.expires_at > utcnow(),
        )
        .order_by(SessionToken.created_at.desc())
    )
    sessions = list(db.scalars(stmt))
    out = []
    for s in sessions:
        item = SessionOut.model_validate(s)
        if current_session_hash and s.token_hash == current_session_hash:
            item.is_current = True
        out.append(item)
    return out


def revoke_session(user: User, session_id: int, db: Session) -> None:
    session = db.get(SessionToken, session_id)
    if session is None or session.user_id != user.id:
        raise AuthError("NOT_FOUND", "Session not found.", status_code=404)
    session.revoked_at = utcnow()
    db.commit()


def request_password_reset(
    payload: ForgotPasswordRequest, request: Request, db: Session
) -> dict:
    user = _find_user_by_login(db, payload.identifier)
    result: dict = {"message": "If the account exists, a reset has been issued."}
    if user is not None:
        raw = generate_reset_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_reset_token(raw),
                expires_at=utcnow()
                + timedelta(minutes=get_settings().RESET_TOKEN_MINUTES),
            )
        )
        db.commit()
        ip, agent = _client_meta(request)
        audit_service.record(
            db,
            action="auth.password_reset_requested",
            user_id=user.id,
            ip_address=ip,
            user_agent=agent,
        )
        settings = get_settings()
        if not settings.is_production:
            # No mail provider is wired in Phase 1 (see docs/06 limitations):
            # in development the token is returned so the flow stays testable.
            result["reset_token"] = raw
    return result


def reset_password(payload: ResetPasswordRequest, request: Request, db: Session) -> dict:
    token_hash = hash_reset_token(payload.token)
    reset = db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    now = utcnow()
    if (
        reset is None
        or reset.used_at is not None
        or reset.expires_at < now
    ):
        raise AuthError("TOKEN_EXPIRED", "Reset link is invalid or expired.")
    user = db.get(User, reset.user_id)
    if user is None:
        raise AuthError("NOT_FOUND", "Account not found.", status_code=404)
    user.password_hash = hash_password(payload.new_password)
    reset.used_at = now
    for s in db.scalars(
        select(SessionToken).where(
            SessionToken.user_id == user.id, SessionToken.revoked_at.is_(None)
        )
    ):
        s.revoked_at = now
    db.commit()
    ip, agent = _client_meta(request)
    audit_service.record(
        db,
        action="auth.password_reset",
        user_id=user.id,
        ip_address=ip,
        user_agent=agent,
    )
    return {"message": "Password updated. Please sign in again."}


def current_session_hash(raw_refresh_token: str | None) -> str | None:
    return digest_token(raw_refresh_token) if raw_refresh_token else None
