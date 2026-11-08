"""Pydantic contracts for the calculator endpoints."""

from pydantic import BaseModel, Field


class FdRequest(BaseModel):
    principal: float = Field(gt=0, le=1e10)
    annual_rate_pct: float = Field(gt=0, le=30)
    years: int = Field(default=0, ge=0, le=30)
    months: int = Field(default=0, ge=0, le=11)
    compounding: str = "quarterly"  # yearly | half_yearly | quarterly | monthly
    senior_citizen_bonus_pct: float = Field(default=0.0, ge=0, le=5)
    tax_slab_pct: float | None = Field(default=None, ge=0, le=60)
    inflation_pct: float | None = Field(default=None, ge=0, le=30)


class MutualFundRequest(BaseModel):
    expected_return_pct: float = Field(ge=0, le=40)
    years: int = Field(ge=1, le=40)
    monthly_sip: float = Field(default=0.0, ge=0, le=1e8)
    initial_lumpsum: float = Field(default=0.0, ge=0, le=1e10)
    step_up_pct: float = Field(default=0.0, ge=0, le=25)
    expense_ratio_pct: float = Field(default=0.0, ge=0, le=3)
    inflation_pct: float | None = Field(default=None, ge=0, le=30)
    target_corpus: float | None = Field(default=None, gt=0, le=1e12)
