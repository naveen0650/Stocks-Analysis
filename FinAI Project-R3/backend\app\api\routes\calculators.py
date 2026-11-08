"""Financial calculator endpoints (FD, mutual fund). Pure deterministic
engines — no market data, no advice; responses carry a disclaimer."""

from fastapi import APIRouter, Depends, HTTPException

from app.calculators.fd import CalculatorInputError, FdInput, fd_maturity
from app.calculators.mutual_fund import MfInput, mutual_fund_projection
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.calculators import FdRequest, MutualFundRequest

router = APIRouter(prefix="/calculators", tags=["calculators"])

DISCLAIMER = (
    "Projections use constant assumed returns and are for education and "
    "research only — not investment advice or a guarantee of outcomes."
)


@router.post("/fd")
def fixed_deposit(
    req: FdRequest, user: User = Depends(get_current_user)
) -> dict:
    try:
        result = fd_maturity(
            FdInput(
                principal=req.principal,
                annual_rate_pct=req.annual_rate_pct,
                years=req.years,
                months=req.months,
                compounding=req.compounding,
                senior_citizen_bonus_pct=req.senior_citizen_bonus_pct,
                tax_slab_pct=req.tax_slab_pct,
                inflation_pct=req.inflation_pct,
            )
        )
    except CalculatorInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**result, "disclaimer": DISCLAIMER}


@router.post("/mutual-fund")
def mutual_fund(
    req: MutualFundRequest, user: User = Depends(get_current_user)
) -> dict:
    try:
        result = mutual_fund_projection(
            MfInput(
                expected_return_pct=req.expected_return_pct,
                years=req.years,
                monthly_sip=req.monthly_sip,
                initial_lumpsum=req.initial_lumpsum,
                step_up_pct=req.step_up_pct,
                expense_ratio_pct=req.expense_ratio_pct,
                inflation_pct=req.inflation_pct,
                target_corpus=req.target_corpus,
            )
        )
    except CalculatorInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**result, "disclaimer": DISCLAIMER}
