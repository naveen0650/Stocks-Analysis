"""Mutual-fund projection engine: SIP (with annual step-up), lumpsum, or
both combined.

Conventions (documented, not hidden):
- expected return is an annual figure; the monthly growth factor is
  (1 + annual)^(1/12) − 1, consistent with the XIRR the engine reports
- the expense ratio is charged annually off the return (r_net = r − TER),
  the standard planning approximation
- SIP instalments are invested at the start of each month
- the annualised return is money-weighted (XIRR) solved by bisection —
  a constant-return simulation reproduces the input rate exactly, which the
  golden tests exploit
- goal-seek inverts the same simulation: future value is linear in the SIP
  amount, so the required instalment is computed exactly, not searched
"""

from __future__ import annotations

from dataclasses import dataclass

from app.calculators.fd import CalculatorInputError


@dataclass(frozen=True)
class MfInput:
    expected_return_pct: float
    years: int
    monthly_sip: float = 0.0
    initial_lumpsum: float = 0.0
    step_up_pct: float = 0.0
    expense_ratio_pct: float = 0.0
    inflation_pct: float | None = None
    target_corpus: float | None = None


def _simulate(
    monthly_sip: float,
    initial_lumpsum: float,
    monthly_growth: float,
    months: int,
    monthly_step_up: float,
) -> tuple[float, list[dict]]:
    """Begin-of-month contributions; returns (final value, year-end marks)."""
    balance = initial_lumpsum
    sip = monthly_sip
    invested = initial_lumpsum
    yearly: list[dict] = []
    for month in range(1, months + 1):
        balance += sip
        invested += sip
        balance *= 1.0 + monthly_growth
        if month % 12 == 0:
            yearly.append(
                {
                    "year": month // 12,
                    "invested": round(invested, 2),
                    "value": round(balance, 2),
                }
            )
            sip *= 1.0 + monthly_step_up
    return balance, yearly


def mutual_fund_projection(mf: MfInput) -> dict:
    if mf.expected_return_pct < 0 or mf.expected_return_pct > 40:
        raise CalculatorInputError("Expected return must be 0–40%.")
    if mf.years < 1 or mf.years > 40:
        raise CalculatorInputError("Tenure must be 1–40 years.")
    if mf.monthly_sip < 0 or mf.initial_lumpsum < 0:
        raise CalculatorInputError("Amounts cannot be negative.")
    if mf.monthly_sip == 0 and mf.initial_lumpsum == 0:
        raise CalculatorInputError(
            "Enter a monthly SIP, an initial lumpsum, or both."
        )
    if not 0 <= mf.step_up_pct <= 25:
        raise CalculatorInputError("Annual step-up must be 0–25%.")
    if not 0 <= mf.expense_ratio_pct <= 3:
        raise CalculatorInputError("Expense ratio must be 0–3%.")
    if mf.inflation_pct is not None and not 0 <= mf.inflation_pct <= 30:
        raise CalculatorInputError("Inflation must be 0–30%.")
    if mf.target_corpus is not None and mf.target_corpus <= 0:
        raise CalculatorInputError("Target corpus must be positive.")

    months = mf.years * 12
    annual_return = mf.expected_return_pct / 100.0
    net_annual = max(annual_return - mf.expense_ratio_pct / 100.0, -0.5)
    monthly_growth = (1.0 + net_annual) ** (1.0 / 12.0) - 1.0
    monthly_step_up = mf.step_up_pct / 100.0

    final_value, yearly = _simulate(
        mf.monthly_sip,
        mf.initial_lumpsum,
        monthly_growth,
        months,
        monthly_step_up,
    )
    invested = mf.initial_lumpsum + sum(
        mf.monthly_sip * ((1.0 + monthly_step_up) ** (m // 12))
        for m in range(months)
    )

    # Money-weighted annualised return (XIRR): bisection on the monthly rate.
    xirr = _solve_xirr(
        monthly_sip=mf.monthly_sip,
        initial_lumpsum=mf.initial_lumpsum,
        months=months,
        monthly_step_up=monthly_step_up,
        final_value=final_value,
    )

    payload: dict = {
        "inputs": {
            "monthly_sip": mf.monthly_sip,
            "initial_lumpsum": mf.initial_lumpsum,
            "expected_return_pct": mf.expected_return_pct,
            "expense_ratio_pct": mf.expense_ratio_pct,
            "net_return_pct": round(net_annual * 100.0, 4),
            "step_up_pct": mf.step_up_pct,
            "years": mf.years,
        },
        "invested": round(invested, 2),
        "final_value": round(final_value, 2),
        "gain": round(final_value - invested, 2),
        "gain_pct": round((final_value / invested - 1.0) * 100.0, 2)
        if invested > 0
        else 0.0,
        "annualised_return_pct": round(xirr * 100.0, 4),
        "expense_drag": round(
            _simulate(
                mf.monthly_sip,
                mf.initial_lumpsum,
                (1.0 + annual_return) ** (1.0 / 12.0) - 1.0,
                months,
                monthly_step_up,
            )[0]
            - final_value,
            2,
        )
        if mf.expense_ratio_pct > 0
        else 0.0,
        "schedule": yearly,
    }

    if mf.inflation_pct is not None:
        deflator = (1.0 + mf.inflation_pct / 100.0) ** mf.years
        payload["inflation_adjusted"] = {
            "inflation_pct": mf.inflation_pct,
            "real_final_value": round(final_value / deflator, 2),
            "real_gain": round(final_value / deflator - invested, 2),
        }

    if mf.target_corpus is not None:
        sip_coefficient, lumpsum_growth = _sip_coefficient(
            mf.initial_lumpsum, monthly_growth, months, monthly_step_up
        )
        required = (mf.target_corpus - lumpsum_growth) / sip_coefficient
        payload["goal_seek"] = {
            "target_corpus": mf.target_corpus,
            "required_monthly_sip": round(max(required, 0.0), 2),
            "reachable_without_sip": lumpsum_growth >= mf.target_corpus,
        }

    return payload


def _sip_coefficient(
    initial_lumpsum: float,
    monthly_growth: float,
    months: int,
    monthly_step_up: float,
) -> tuple[float, float]:
    """Future value = lumpsum_growth + sip * coefficient (exact linearity).
    Both parts unrounded — rounding is display-only in the schedule."""
    lumpsum_growth, _ = _simulate(
        0.0, initial_lumpsum, monthly_growth, months, 0.0
    )
    coefficient, _ = _simulate(
        1.0, 0.0, monthly_growth, months, monthly_step_up
    )
    return coefficient, lumpsum_growth


def _solve_xirr(
    monthly_sip: float,
    initial_lumpsum: float,
    months: int,
    monthly_step_up: float,
    final_value: float,
) -> float:
    """Bisection on the annual IRR; the simulation is smooth and monotone in
    the rate, so 200 halvings of a wide bracket converge far below 1e-9."""

    def fv_at(annual_rate: float) -> float:
        m = (1.0 + annual_rate) ** (1.0 / 12.0) - 1.0
        return _simulate(
            monthly_sip, initial_lumpsum, m, months, monthly_step_up
        )[0]

    lo, hi = -0.9, 5.0
    f_lo = fv_at(lo) - final_value
    f_hi = fv_at(hi) - final_value
    for _ in range(200):
        mid = (lo + hi) / 2.0
        f_mid = fv_at(mid) - final_value
        if abs(f_mid) < 1e-4:
            return mid
        if (f_lo < 0) != (f_mid < 0):
            hi, f_hi = mid, f_mid
        else:
            lo, f_lo = mid, f_mid
    return (lo + hi) / 2.0
