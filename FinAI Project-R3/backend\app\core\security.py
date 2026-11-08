"""Password hashing and token primitives.

Refresh tokens are random opaque strings; only their HMAC-SHA256 digest is
persisted, so a database leak does not yield usable credentials.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int, role: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "jti": secrets.token_hex(8),
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate an access token. Raises jwt.PyJWTError on failure."""
    settings = get_settings()
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[_ALGORITHM])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("wrong token type")
    return payload


def generate_refresh_token() -> tuple[str, datetime]:
    """Return (raw_token, expires_at). Only the digest of raw_token is stored."""
    settings = get_settings()
    raw = secrets.token_urlsafe(48)
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return raw, expires_at


def digest_token(raw_token: str) -> str:
    settings = get_settings()
    return hmac.new(
        settings.SECRET_KEY.encode(), raw_token.encode(), hashlib.sha256
    ).hexdigest()


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
