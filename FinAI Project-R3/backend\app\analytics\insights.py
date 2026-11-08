"""Guarded rule engine that turns aggregated figures into insights.

Every rule has a data-sufficiency guard; when the guard fails the rule stays
silent. Every insight carries its evidence — the actual numbers it was derived
from — so the UI never shows an unsupported claim.
"""

from decimal import Decimal

from app.analytics.aggregation import recurring_merchants, weekend_weekday_split

CATEGORY_SPIKE_RATIO = 1.2
CATEGORY_SPIKE_MIN_DELTA = 500.0
CONCENTRATION_SHARE = 35.0
WEEKEND_RATIO = 1.3
SAVINGS_RATE_MIN_HISTORY = 2
MIN_ROWS_FOR_WEEKEND = 14


def category_spikes(
    monthly_category_totals: dict[str, dict[str, Decimal]],
) -> list[dict]:
    """monthly_category_totals: month_key -> {category: total}."""
    insights: list[dict] = []
    months = sorted(monthly_category_totals)
    if len(months) < 2:
        return insights
    current, previous = monthly_category_totals[months[-1]], monthly_category_totals[months[-2]]
    for category, curr_total in current.items():
        prev_total = previous.get(category, Decimal(0))
        if prev_total <= 0:
            continue
        ratio = float(curr_total) / float(prev_total)
        delta = float(curr_total - prev_total)
        if ratio >= CATEGORY_SPIKE_RATIO and delta >= CATEGORY_SPIKE_MIN_DELTA:
            insights.append(
                {
                    "type": "category_spike",
                    "severity": "warning",
                    "title": f"{category.title()} spending is up {round((ratio - 1) * 100)}%",
                    "message": (
                        f"Your {category} expenses this month are ₹{float(curr_total):,.0f} "
                        f"compared with ₹{float(prev_total):,.0f} last month — an increase "
                        f"of ₹{delta:,.0f}."
                    ),
                    "evidence": {
                        "category": category,
                        "current_month": months[-1],
                        "current_total": float(curr_total),
                        "previous_month": months[-2],
                        "previous_total": float(prev_total),
                        "change_pct": round((ratio - 1) * 100, 1),
                    },
                }
            )
    return insights


def spending_concentration(
    distribution: list[dict], month: str | None = None
) -> list[dict]:
    if not distribution:
        return []
    top = distribution[0]
    if top["share_pct"] < CONCENTRATION_SHARE:
        return []
    return [
        {
            "type": "concentration",
            "severity": "info",
            "title": f"{top['category'].title()} dominates your spending",
            "message": (
                f"{top['category'].title()} represents {top['share_pct']:.0f}% of your "
                f"spending this period (₹{top['total']:,.0f}) — reviewing it offers the "
                f"largest savings opportunity."
            ),
            "evidence": {"category": top["category"], **top, "month": month},
        }
    ]


def recurring_load(recurring: list[dict]) -> list[dict]:
    if len(recurring) < 3:
        return []
    monthly_total = sum(r["amount"] for r in recurring)
    names = ", ".join(r["merchant"].title() for r in recurring[:3])
    extra = len(recurring) - 3
    suffix = f" (+{extra} more)" if extra > 0 else ""
    return [
        {
            "type": "recurring_load",
            "severity": "info",
            "title": f"{len(recurring)} recurring payments detected",
            "message": (
                f"{names}{suffix} repeat monthly — together about "
                f"₹{monthly_total:,.0f}/month (₹{monthly_total * 12:,.0f}/year)."
            ),
            "evidence": {"merchants": recurring, "monthly_total": monthly_total},
        }
    ]


def weekend_pattern(rows: list[dict]) -> list[dict]:
    if len(rows) < MIN_ROWS_FOR_WEEKEND:
        return []
    split = weekend_weekday_split([(r["date"], r["amount"]) for r in rows])
    weekend, weekday = split["weekend_daily_avg"], split["weekday_daily_avg"]
    if not weekend or not weekday or weekday <= 0:
        return []
    ratio = weekend / weekday
    if ratio < WEEKEND_RATIO:
        return []
    return [
        {
            "type": "weekend_pattern",
            "severity": "info",
            "title": "Weekends cost you noticeably more",
            "message": (
                f"Your weekend daily average (₹{weekend:,.0f}) is {ratio:.1f}× your "
                f"weekday average (₹{weekday:,.0f})."
            ),
            "evidence": {**split, "ratio": round(ratio, 2)},
        }
    ]


def savings_trend(
    monthly_income: dict[str, Decimal], monthly_expense: dict[str, Decimal]
) -> list[dict]:
    months = sorted(set(monthly_income) & set(monthly_expense))
    if len(months) < SAVINGS_RATE_MIN_HISTORY:
        return []
    current, previous = months[-1], months[-2]

    def rate(m: str) -> float | None:
        income = float(monthly_income[m])
        if income <= 0:
            return None
        return (income - float(monthly_expense[m])) / income * 100

    curr_rate, prev_rate = rate(current), rate(previous)
    if curr_rate is None or prev_rate is None:
        return []
    delta_pp = curr_rate - prev_rate
    if abs(delta_pp) < 5:
        return []
    direction = "improved" if delta_pp > 0 else "declined"
    severity = "info" if delta_pp > 0 else "warning"
    return [
        {
            "type": "savings_trend",
            "severity": severity,
            "title": f"Savings rate {direction} {abs(delta_pp):.0f} percentage points",
            "message": (
                f"Your savings rate moved from {prev_rate:.0f}% ({previous}) to "
                f"{curr_rate:.0f}% ({current})."
            ),
            "evidence": {
                "previous_month": previous,
                "previous_rate": round(prev_rate, 1),
                "current_month": current,
                "current_rate": round(curr_rate, 1),
                "change_pp": round(delta_pp, 1),
            },
        }
    ]


def budget_pressure(budget_statuses: list[dict]) -> list[dict]:
    insights = []
    for b in budget_statuses:
        if not b.get("is_active"):
            continue
        utilization = b.get("utilization_pct") or 0
        triggered = b.get("triggered_alerts") or []
        if not triggered:
            continue
        highest = max(triggered)
        severity = "critical" if highest >= 100 else "warning"
        verb = "exceeded" if highest >= 100 else "crossed"
        insights.append(
            {
                "type": "budget_pressure",
                "severity": severity,
                "title": f"Budget '{b['name']}' {verb}",
                "message": (
                    f"You have used {utilization:.0f}% of the {b['name']} budget "
                    f"(₹{float(b['actual']):,.0f} of ₹{float(b['amount']):,.0f})."
                ),
                "evidence": {**b},
            }
        )
    return insights


def generate_insights(
    monthly_category_totals: dict[str, dict[str, Decimal]],
    distribution: list[dict],
    expense_rows: list[dict],
    monthly_income: dict[str, Decimal],
    monthly_expense: dict[str, Decimal],
    budget_statuses: list[dict] | None = None,
) -> list[dict]:
    """Compose all applicable insights. Order: critical > warning > info."""
    recurring = recurring_merchants(expense_rows)
    raw = [
        *budget_pressure(budget_statuses or []),
        *category_spikes(monthly_category_totals),
        *spending_concentration(distribution),
        *savings_trend(monthly_income, monthly_expense),
        *recurring_load(recurring),
        *weekend_pattern(expense_rows),
    ]
    severity_rank = {"critical": 0, "warning": 1, "info": 2}
    return sorted(raw, key=lambda i: severity_rank[i["severity"]])
