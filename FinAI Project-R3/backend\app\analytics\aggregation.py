"""Pure aggregation helpers for expense/income series.

Inputs are plain rows of (date, amount) or richer dicts so the functions stay
I/O-free and directly unit-testable. All money math uses Decimal until the
boundary where values are serialized.
"""

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal


def month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def sum_by_day(rows: list[tuple[date, Decimal]]) -> dict[date, Decimal]:
    totals: dict[date, Decimal] = defaultdict(Decimal)
    for d, amount in rows:
        totals[d] += amount
    return dict(totals)


def sum_by_month(rows: list[tuple[date, Decimal]]) -> dict[str, Decimal]:
    totals: dict[str, Decimal] = defaultdict(Decimal)
    for d, amount in rows:
        totals[month_key(d)] += amount
    return dict(sorted(totals.items()))


def monthly_series(
    rows: list[tuple[date, Decimal]], months: int
) -> list[dict]:
    """Continuous monthly series (filling gaps with zero) for charting."""
    if not rows:
        return []
    totals = sum_by_month(rows)
    last = max(d for d, _ in rows)
    first_of_last = last.replace(day=1)
    series = []
    cursor = first_of_last
    going_back: list[str] = []
    for _ in range(months):
        going_back.append(month_key(cursor))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    for key in reversed(going_back):
        series.append({"month": key, "total": float(totals.get(key, Decimal(0)))})
    return series


def period_totals(rows: list[tuple[date, Decimal]]) -> dict:
    """Total, average and count over the given rows."""
    if not rows:
        return {"total": 0.0, "average": 0.0, "count": 0}
    total = sum((amount for _, amount in rows), Decimal(0))
    return {
        "total": float(total),
        "average": float(total / len(rows)),
        "count": len(rows),
    }


def mom_delta(series: list[dict]) -> float | None:
    """Percentage change between the last two months of a monthly series."""
    if len(series) < 2:
        return None
    prev, curr = series[-2]["total"], series[-1]["total"]
    if prev == 0:
        return None
    return round((curr - prev) / prev * 100, 1)


def category_distribution(
    rows: list[tuple[str, Decimal]], total: Decimal | None = None
) -> list[dict]:
    """Share of spend per category, sorted descending."""
    if total is None:
        total = sum((amount for _, amount in rows), Decimal(0))
    if total == 0:
        return []
    totals: dict[str, Decimal] = defaultdict(Decimal)
    for name, amount in rows:
        totals[name] += amount
    return [
        {
            "category": name,
            "total": float(amount),
            "share_pct": round(float(amount / total * 100), 1),
        }
        for name, amount in sorted(totals.items(), key=lambda kv: kv[1], reverse=True)
    ]


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5


def weekend_weekday_split(rows: list[tuple[date, Decimal]]) -> dict:
    weekend = [(d, a) for d, a in rows if is_weekend(d)]
    weekday = [(d, a) for d, a in rows if not is_weekend(d)]

    def daily_avg(parts: list[tuple[date, Decimal]]) -> float | None:
        if not parts:
            return None
        days = {d for d, _ in parts}
        return float(sum((a for _, a in parts), Decimal(0)) / len(days))

    return {
        "weekend_daily_avg": daily_avg(weekend),
        "weekday_daily_avg": daily_avg(weekday),
        "weekend_days": len({d for d, _ in weekend}),
        "weekday_days": len({d for d, _ in weekday}),
    }


def recurring_merchants(
    rows: list[dict], min_occurrences: int = 3
) -> list[dict]:
    """Merchants appearing with a stable amount across >= min_occurrences months.

    rows must carry: merchant, amount, date.
    """
    seen: dict[tuple[str, Decimal], set[str]] = defaultdict(set)
    for r in rows:
        merchant = (r.get("merchant") or "").strip()
        if not merchant:
            continue
        seen[(merchant.lower(), Decimal(str(r["amount"])))].add(month_key(r["date"]))
    return [
        {"merchant": merchant, "amount": float(amount), "months": len(months)}
        for (merchant, amount), months in seen.items()
        if len(months) >= min_occurrences
    ]
