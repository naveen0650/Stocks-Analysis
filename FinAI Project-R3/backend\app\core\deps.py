"""Shared FastAPI dependencies: DB session, current user, RBAC, user rate limit."""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.ratelimit import key_rate_limit
from app.db.session import get_db
from app.models.user import Role, User
from app.core.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "NOT_AUTHENTICATED", "message": "Missing bearer token."},
        )
    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "TOKEN_EXPIRED", "message": "Access token expired."},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid access token."},
        )

    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_DISABLED", "message": "Account is disabled."},
        )
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != Role.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Administrator access required."},
        )
    return user


def require_user_rate(limit: int, window_seconds: int, scope: str = "req"):
    """Dependency factory: per-user rate limit applied after authentication."""

    def dependency(user: User = Depends(get_current_user)) -> User:
        key_rate_limit(f"u{user.id}", scope, limit, window_seconds)
        return user

    return dependency
