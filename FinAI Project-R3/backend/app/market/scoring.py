"""Explainable weighted stock score.

Mirrors the financial health score's contract (docs/05): every factor
reports its weight, raw sub-score and contribution; factors whose inputs
are missing are marked `not_evaluated` and their weight is redistributed.
The score is a structured opinion on recorded data, never investment
advice — responses carry the disclaimer.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.analytics.health_score import _linear_score

GRADES = [
    (70, "Attractive"),
    (55, "Fairly Valued"),
    (40, "Expensive"),
    (0, "Avoid"),
]


def _grade(score: int, grades: list[tuple[int, str]]) -> str:
    for threshold, name in grades:
        if score >= threshold:
            return name
    return grades[-1][1]

DISCLAIMER = (
    "Scores are quantitative screens on recorded data for education and "
    "research only and are not investment advice."
)


@dataclass
class FactorInput:
    key: str
    label: str
    weight: float
    value: float | None = None  # None => not evaluated


def _pct(value: float | None) -> str:
    return f"{value:.1f}%" if value is not None else "n/a"


def compute_stock_score(
    upside_pct: float | None,
    peg: float | None,
    roe_pct: float | None,
    return_6m_pct: float | None,
    drawdown_pct: float | None,
    volatility_pct: float | None,
) -> dict:
    factors_in = [
        FactorInput("valuation_upside", "Valuation upside (blended)", 0.30, upside_pct),
        FactorInput("peg", "Growth-adjusted value (PEG)", 0.15, peg),
        FactorInput("profitability", "Return on equity", 0.20, roe_pct),
        FactorInput("momentum", "6-month return", 0.15, return_6m_pct),
        FactorInput("drawdown", "Max drawdown (6m)", 0.10, drawdown_pct),
        FactorInput("volatility", "Annualised volatility", 0.10, volatility_pct),
    ]
    reasons = {
        "valuation_upside": "Requires fundamentals for at least one valuation method.",
        "peg": "Requires positive EPS and EPS growth.",
        "profitability": "Requires ROE in fundamentals.",
        "momentum": "Requires ~6 months of price history.",
        "drawdown": "Requires ~6 months of price history.",
        "volatility": "Requires ~1 month of price history.",
    }

    evaluated = [f for f in factors_in if f.value is not None]
    evaluated_weight = sum(f.weight for f in evaluated)

    factors_out: list[dict] = []
    total = 0.0
    for f in factors_in:
        if f.value is None:
            factors_out.append(
                {
                    "key": f.key,
                    "label": f.label,
                    "weight": f.weight,
                    "effective_weight": None,
                    "factor_score": None,
                    "contribution": None,
                    "status": "not_evaluated",
                    "reason": reasons[f.key],
                    "value": None,
                }
            )
            continue

        if f.key == "valuation_upside":
            raw = _linear_score(f.value, 30.0, -30.0)
        elif f.key == "peg":
            raw = _linear_score(f.value, 1.0, 3.0)
        elif f.key == "profitability":
            raw = _linear_score(f.value, 18.0, 6.0)
        elif f.key == "momentum":
            raw = _linear_score(f.value, 15.0, -15.0)
        elif f.key == "drawdown":
            raw = _linear_score(f.value, 0.0, -40.0)
        else:  # volatility
            raw = _linear_score(f.value, 15.0, 45.0)

        raw = round(raw, 1)
        effective = round(f.weight / evaluated_weight, 4) if evaluated_weight else 0.0
        contribution = round(raw * effective, 1)
        total += contribution
        factors_out.append(
            {
                "key": f.key,
                "label": f.label,
                "weight": f.weight,
                "effective_weight": effective,
                "factor_score": raw,
                "contribution": contribution,
                "status": "evaluated",
                "reason": None,
                "value": round(f.value, 4),
            }
        )

    score = int(round(total))
    return {
        "score": score,
        "grade": _grade(score, GRADES),
        "factors": factors_out,
        "evaluated_count": len(evaluated),
        "disclaimer": DISCLAIMER,
    }
