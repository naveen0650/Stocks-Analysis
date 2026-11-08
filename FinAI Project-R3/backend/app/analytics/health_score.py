"""Transparent, weighted financial health score.

The model is documented (docs/05-ai-ml-architecture.md) and every factor
reports its own contribution. Factors without sufficient data are marked
`not_evaluated` and their weight is redistributed to the evaluated ones —
the score never invents inputs.
"""

from dataclasses import dataclass

SAVINGS_RATE_CAP = 20.0          # savings rate (in %) that earns a full mark
EXPENSE_RATIO_GOOD = 0.5         # expense/income at or below this -> full mark
EXPENSE_RATIO_BAD = 1.0          # expense/income at or above this -> zero
BUDGET_ADHERENCE_GOOD = 85.0     # utilization at or below -> full mark
BUDGET_ADHERENCE_BAD = 120.0     # utilization at or above -> zero
RECURRING_RATIO_GOOD = 30.0      # recurring share at or below -> full mark
RECURRING_RATIO_BAD = 60.0       # recurring share at or above -> zero
EMERGENCY_FUND_TARGET_MONTHS = 6.0

GRADES = [(85, "Excellent"), (70, "Good"), (55, "Fair"), (40, "Needs Work"), (0, "At Risk")]


@dataclass
class FactorInput:
    key: str
    label: str
    weight: float
    value: float | None = None  # None => not evaluated


def _linear_score(value: float, good: float, bad: float) -> float:
    """Score 0..100, full marks at `good`, zero at `bad` (either direction)."""
    if good == bad:
        return 0.0
    if bad > good:
        score = (bad - value) / (bad - good) * 100
    else:
        score = (value - bad) / (good - bad) * 100
    return max(0.0, min(100.0, score))


def _grade(score: int) -> str:
    for threshold, name in GRADES:
        if score >= threshold:
            return name
    return GRADES[-1][1]


def compute_health_score(
    savings_rate_pct: float | None,
    expense_to_income: float | None,
    budget_utilization_pct: float | None,
    recurring_ratio_pct: float | None,
    emergency_fund_months: float | None,
    diversification_pct: float | None = None,
    window_days: int = 90,
) -> dict:
    factors_in = [
        FactorInput(
            "savings_rate",
            "Savings rate",
            0.25,
            savings_rate_pct,
        ),
        FactorInput(
            "expense_to_income",
            "Expense-to-income ratio",
            0.20,
            expense_to_income,
        ),
        FactorInput(
            "budget_adherence",
            "Budget adherence",
            0.15,
            budget_utilization_pct,
        ),
        FactorInput(
            "recurring_ratio",
            "Recurring expense ratio",
            0.10,
            recurring_ratio_pct,
        ),
        FactorInput(
            "emergency_fund",
            "Emergency fund coverage",
            0.15,
            emergency_fund_months,
        ),
        FactorInput(
            "diversification",
            "Investment diversification",
            0.15,
            diversification_pct,
        ),
    ]

    evaluated = [f for f in factors_in if f.value is not None]
    not_evaluated = [f for f in factors_in if f.value is None]
    evaluated_weight = sum(f.weight for f in evaluated)

    suggestions_pool = {
        "savings_rate": "Aim to save at least 20% of your income.",
        "expense_to_income": "Keep total spending under 50% of income.",
        "budget_adherence": "Review budgets you have exceeded and adjust limits or spending.",
        "recurring_ratio": "Audit recurring subscriptions; cancel the ones you no longer use.",
        "emergency_fund": "Build an emergency fund covering 6 months of expenses.",
        "diversification": "Spread investments across sectors and instruments (portfolio module).",
    }

    factors_out = []
    total = 0.0
    for f in factors_in:
        if f.value is None:
            phase_note = (
                "Requires portfolio holdings (Phase 3 module)."
                if f.key == "diversification"
                else "Not enough data yet — keep recording income and expenses."
                if f.key in {"savings_rate", "expense_to_income"}
                else "Requires more history to evaluate."
            )
            factors_out.append(
                {
                    "key": f.key,
                    "label": f.label,
                    "weight": f.weight,
                    "effective_weight": None,
                    "factor_score": None,
                    "contribution": None,
                    "status": "not_evaluated",
                    "reason": phase_note,
                    "explanation": None,
                    "suggestions": [suggestions_pool[f.key]],
                }
            )
            continue

        if f.key == "savings_rate":
            raw = _linear_score(f.value, SAVINGS_RATE_CAP, 0.0)
            explanation = (
                f"You saved {f.value:.1f}% of income over the last {window_days} days."
                if f.value is not None
                else ""
            )
        elif f.key == "expense_to_income":
            raw = _linear_score(f.value, EXPENSE_RATIO_GOOD, EXPENSE_RATIO_BAD)
            explanation = (
                f"Spending equals {f.value * 100:.0f}% of recorded income "
                f"over the last {window_days} days."
            )
        elif f.key == "budget_adherence":
            raw = _linear_score(f.value, BUDGET_ADHERENCE_GOOD, BUDGET_ADHERENCE_BAD)
            explanation = f"Average budget utilization is {f.value:.0f}%."
        elif f.key == "recurring_ratio":
            raw = _linear_score(f.value, RECURRING_RATIO_GOOD, RECURRING_RATIO_BAD)
            explanation = f"Recurring payments make up {f.value:.0f}% of your spending."
        elif f.key == "emergency_fund":
            raw = _linear_score(
                f.value, EMERGENCY_FUND_TARGET_MONTHS, 0.0
            )
            explanation = (
                f"Your recorded liquid savings cover about {f.value:.1f} months of "
                f"average expenses."
            )
        else:  # diversification
            raw = _linear_score(f.value, 100.0, 0.0)
            explanation = f"Largest single-investment concentration is {100 - f.value:.0f}%."

        raw = round(raw, 1)
        # Not-evaluated weights are redistributed proportionally: effective
        # weights renormalize to 1.0 across evaluated factors only.
        effective_weight = round(f.weight / evaluated_weight, 4) if evaluated_weight else 0.0
        contribution = round(raw * effective_weight, 1)
        total += contribution
        factors_out.append(
            {
                "key": f.key,
                "label": f.label,
                "weight": f.weight,
                "effective_weight": effective_weight,
                "factor_score": raw,
                "contribution": contribution,
                "status": "evaluated",
                "reason": None,
                "explanation": explanation,
                "suggestions": (
                    [suggestions_pool[f.key]] if raw < 80 else []
                ),
            }
        )

    score = int(round(total))
    return {
        "score": score,
        "grade": _grade(score),
        "factors": factors_out,
        "evaluated_count": len(evaluated),
        "window_days": window_days,
    }
