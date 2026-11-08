"""Auth and profile request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.user import Role

MOBILE_PATTERN = r"^[6-9]\d{9}$"


class RegisterRequest(BaseModel):
    email: EmailStr | None = None
    mobile: str | None = Field(default=None, pattern=MOBILE_PATTERN)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    disclaimer_version: str = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def require_email_or_mobile(self) -> "RegisterRequest":
        if not self.email and not self.mobile:
            raise ValueError("Either email or mobile number is required.")
        return self


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=200)


class UserOut(BaseModel):
    id: int
    email: str | None
    mobile: str | None
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    mobile: str | None = Field(default=None, pattern=MOBILE_PATTERN)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=8, max_length=128)


class SessionOut(BaseModel):
    id: int
    user_agent: str
    ip_address: str
    created_at: datetime
    last_used_at: datetime | None
    expires_at: datetime
    revoked_at: datetime | None
    is_current: bool = False

    model_config = {"from_attributes": True}


TokenPair.model_rebuild()
