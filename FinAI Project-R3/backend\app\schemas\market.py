"""Pydantic contracts for the market-analysis endpoints."""

from pydantic import BaseModel, Field


class ValuationAssumptions(BaseModel):
    """Editable valuation assumptions (Phase 2 requirement: the user can
    flex every driver and see fair value move)."""

    projection_years: int = Field(default=5, ge=1, le=10)
    stage1_growth_pct: float = Field(default=14.0, ge=-50.0, le=100.0)
    terminal_growth_pct: float = Field(default=4.5, ge=-5.0, le=25.0)
    wacc_pct: float = Field(default=10.5, gt=0.0, le=50.0)
    pe_target: float = Field(default=22.0, gt=0.0, le=200.0)
    ev_ebitda_target: float = Field(default=14.0, gt=0.0, le=100.0)
    ddm_growth_pct: float = Field(default=4.5, ge=0.0, le=25.0)
    required_return_pct: float = Field(default=10.5, gt=0.0, le=50.0)
