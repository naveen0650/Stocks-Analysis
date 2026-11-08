"""Analytics & AI insight response schemas (open models — explained payloads)."""

from pydantic import BaseModel, Field


class Insight(BaseModel):
    type: str
    severity: str = "info"  # info | warning | critical
    title: str
    message: str
    evidence: dict = Field(default_factory=dict)


class AnomalyFlag(BaseModel):
    kind: str  # transaction | daily_total
    expense_id: int | None = None
    expense_date: str | None = None
    category: str | None = None
    merchant: str | None = None
    amount: float
    mean: float
    std: float
    z_score: float
    sample_size: int
    explanation: str


class HealthFactor(BaseModel):
    key: str
    label: str
    weight: float
    effective_weight: float | None = None
    factor_score: float | None = None
    contribution: float | None = None
    status: str = "evaluated"  # evaluated | not_evaluated
    reason: str | None = None
    explanation: str | None = None
    suggestions: list[str] = Field(default_factory=list)


class HealthScore(BaseModel):
    score: int
    grade: str
    factors: list[HealthFactor]
    evaluated_count: int
    window_days: int


class AdminUserRow(BaseModel):
    id: int
    email: str | None
    mobile: str | None
    full_name: str
    role: str
    is_active: bool
    created_at: str
    last_login_at: str | None
    expense_count: int


class AuditRow(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity: str | None
    entity_id: int | None
    ip_address: str
    created_at: str
    meta: dict | None
