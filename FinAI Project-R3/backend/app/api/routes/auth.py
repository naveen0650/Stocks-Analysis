"""Authentication, profile and session endpoints."""

from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.ratelimit import ip_rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileUpdate,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionOut,
    TokenPair,
    UserOut,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

AUTH_RATE = ip_rate_limit("auth", limit=10, window_seconds=300)


@router.post("/register", response_model=TokenPair, status_code=201)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(AUTH_RATE),
) -> TokenPair:
    return auth_service.register(payload, request, db)


@router.post("/login", response_model=TokenPair)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(AUTH_RATE),
) -> TokenPair:
    return auth_service.login(payload, request, db)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenPair:
    return auth_service.refresh(payload.refresh_token, db)


@router.post("/logout")
def logout(
    payload: RefreshRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    auth_service.logout(payload.refresh_token, user, db)
    return {"message": "Signed out."}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_profile(
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    return auth_service.update_profile(user, payload, db)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    auth_service.change_password(user, payload, request, db)
    return {"message": "Password changed."}


@router.get("/sessions", response_model=list[SessionOut])
def sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_refresh_token: str | None = Header(default=None, alias="X-Refresh-Token"),
) -> list[SessionOut]:
    return auth_service.list_sessions(
        user, auth_service.current_session_hash(x_refresh_token), db
    )


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    auth_service.revoke_session(user, session_id, db)
    return {"message": "Session revoked."}


@router.post("/password/forgot")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(AUTH_RATE),
) -> dict:
    return auth_service.request_password_reset(payload, request, db)


@router.post("/password/reset")
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(AUTH_RATE),
) -> dict:
    return auth_service.reset_password(payload, request, db)
