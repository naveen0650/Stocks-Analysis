"""Fixed-deposit (FD) maturity engine.

Bank-style compound interest: principal grows at (nominal annual rate +
optional senior-citizen bonus) compounded at the chosen frequency. Optional
post-tax view (flat slab on interest earned) and inflation-adjusted (real)
maturity value. Every result carries its inputs and a year-by-year schedule.
"""

from __future__ import annotations

from dataclasses import dataclass

COMPOUNDING_PER_YEAR = {
    "yearly": 1,
    "half_yearly": 2,
    "quarterly": 4,
    "monthly": 12,
}


class CalculatorInputError(ValueError):
    """Invalid calculator inputs; routes map this to 422."""


@dataclass(frozen=True)
class FdInput:
    principal: float
    annual_rate_pct: float
    years: int
    months: int
    compounding: str = "quarterly"
    senior_citizen_bonus_pct: float = 0.0
    tax_slab_pct: float | None = None
    inflation_pct: float | None = None


def fd_maturity(fd: FdInput) -> dict:
    if fd.principal <= 0:
        raise CalculatorInputError("Principal must be positive.")
    if fd.annual_rate_pct <= 0 or fd.annual_rate_pct > 30:
        raise CalculatorInputError("Interest rate must be between 0 and 30%.")
    if fd.years < 0 or fd.months < 0 or fd.years + fd.months == 0:
        raise CalculatorInputError("Tenure must be at least one month.")
    if fd.years > 30:
        raise CalculatorInputError("Tenure cannot exceed 30 years.")
    freq = COMPOUNDING_PER_YEAR.get(fd.compounding)
    if freq is None:
        raise CalculatorInputError(
            f"Unknown compounding frequency '{fd.compounding}'."
        )
    if not 0 <= fd.senior_citizen_bonus_pct <= 5:
        raise CalculatorInputError("Senior-citizen bonus must be 0–5%.")
    if fd.tax_slab_pct is not None and not 0 <= fd.tax_slab_pct <= 60:
        raise CalculatorInputError("Tax slab must be 0–60%.")
    if fd.inflation_pct is not None and not 0 <= fd.inflation_pct <= 30:
        raise CalculatorInputError("Inflation must be 0–30%.")

    total_months = fd.years * 12 + fd.months
    years_exact = total_months / 12.0
    rate = fd.annual_rate_pct + fd.senior_citizen_bonus_pct
    period_rate = rate / 100.0 / freq
    periods = freq * years_exact

    maturity = fd.principal * (1.0 + period_rate) ** periods
    interest = maturity - fd.principal

    # Nominal vs effective annual yield: effective annualises the intra-year
    # compounding, which is why a 6.5% quarterly FD yields more than 6.5%.
    effective_yield = ((1.0 + period_rate) ** freq - 1.0) * 100.0

    # Year-by-year schedule (final row may be a partial year).
    schedule: list[dict] = []
    full_years = int(fd.years)
    for year in range(1, full_years + 1):
        closing = fd.principal * (1.0 + period_rate) ** (freq * year)
        opening = (
            fd.principal
            if year == 1
            else schedule[-1]["closing"]
        )
        schedule.append(
            {
                "year": year,
                "opening": round(opening, 2),
                "interest": round(closing - opening, 2),
                "closing": round(closing, 2),
            }
        )
    if fd.months > 0:
        closing = maturity
        opening = fd.principal * (1.0 + period_rate) ** (freq * full_years)
        schedule.append(
            {
                "year": full_years + 1,
                "opening": round(opening, 2),
                "interest": round(closing - opening, 2),
                "closing": round(closing, 2),
                "partial_year_months": fd.months,
            }
        )

    payload: dict = {
        "inputs": {
            "principal": fd.principal,
            "annual_rate_pct": fd.annual_rate_pct,
            "senior_citizen_bonus_pct": fd.senior_citizen_bonus_pct,
            "effective_rate_pct": round(rate, 4),
            "tenure_months": total_months,
            "compounding": fd.compounding,
        },
        "principal": fd.principal,
        "maturity_value": round(maturity, 2),
        "total_interest": round(interest, 2),
        "interest_share_pct": round(interest / maturity * 100.0, 2),
        "effective_annual_yield_pct": round(effective_yield, 4),
        "schedule": schedule,
    }

    if fd.tax_slab_pct is not None:
        tax = interest * fd.tax_slab_pct / 100.0
        post_tax_maturity = fd.principal + interest - tax
        payload["tax"] = {
            "slab_pct": fd.tax_slab_pct,
            "tax_on_interest": round(tax, 2),
            "post_tax_maturity": round(post_tax_maturity, 2),
            "post_tax_gain_pct": round(
                (post_tax_maturity / fd.principal - 1.0) * 100.0, 2
            ),
        }

    if fd.inflation_pct is not None:
        deflator = (1.0 + fd.inflation_pct / 100.0) ** years_exact
        payload["inflation_adjusted"] = {
            "inflation_pct": fd.inflation_pct,
            "real_maturity_value": round(maturity / deflator, 2),
            "real_gain": round(maturity / deflator - fd.principal, 2),
        }

    return payload
