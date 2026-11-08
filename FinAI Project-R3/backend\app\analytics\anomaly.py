"""Z-score anomaly detection over transactions and daily totals.

Deliberately conservative: a category needs a minimum history sample before
anything is flagged, and every flag carries its reference statistics so the
UI can explain exactly why it fired.
"""

from collections import defaultdict
from datetime import date
from decimal import Decimal
import statistics

Z_THRESHOLD = 2.5
MIN_TRANSACTION_SAMPLES = 8
MIN_DAILY_SAMPLES = 14


def _stats(values: list[float]) -> tuple[float, float] | None:
    if len(values) < 2:
        return None
    mean = statistics.fmean(values)
    stdev = statistics.pstdev(values)
    if stdev == 0:
        return None
    return mean, stdev


def transaction_anomalies(
    rows: list[dict], z_threshold: float = Z_THRESHOLD
) -> list[dict]:
    """Flag individual transactions that are extreme within their category.

    rows: dicts with keys expense_id, date (date), amount (Decimal),
    category (str), merchant (str|None). The reference distribution is the
    category's other transactions inside the supplied window.
    """
    by_category: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_category[r["category"]].append(r)

    flags: list[dict] = []
    for category, cat_rows in by_category.items():
        values = [float(r["amount"]) for r in cat_rows]
        stats = _stats(values)
        if stats is None or len(values) < MIN_TRANSACTION_SAMPLES:
            continue
        mean, stdev = stats
        for r in cat_rows:
            amount = float(r["amount"])
            z = (amount - mean) / stdev
            if z > z_threshold:
                flags.append(
                    {
                        "kind": "transaction",
                        "expense_id": r["expense_id"],
                        "expense_date": r["date"].isoformat(),
                        "category": category,
                        "merchant": r.get("merchant"),
                        "amount": amount,
                        "mean": round(mean, 2),
                        "std": round(stdev, 2),
                        "z_score": round(z, 2),
                        "sample_size": len(values),
                        "explanation": (
                            f"This ₹{amount:,.0f} {category} expense is "
                            f"{z:.1f} standard deviations above your category "
                            f"average of ₹{mean:,.0f}."
                        ),
                    }
                )
    flags.sort(key=lambda f: f["z_score"], reverse=True)
    return flags


def daily_total_anomalies(
    rows: list[tuple[date, Decimal]], z_threshold: float = Z_THRESHOLD
) -> list[dict]:
    """Flag unusually heavy spending days against the user's daily baseline."""
    if len(rows) < MIN_DAILY_SAMPLES:
        return []
    daily: dict[date, Decimal] = defaultdict(Decimal)
    for d, amount in rows:
        daily[d] += amount

    values = [float(v) for v in daily.values()]
    stats = _stats(values)
    if stats is None:
        return []
    mean, stdev = stats

    flags = []
    for d in sorted(daily):
        amount = float(daily[d])
        z = (amount - mean) / stdev
        if z > z_threshold and amount > 0:
            flags.append(
                {
                    "kind": "daily_total",
                    "expense_id": None,
                    "expense_date": d.isoformat(),
                    "category": None,
                    "merchant": None,
                    "amount": amount,
                    "mean": round(mean, 2),
                    "std": round(stdev, 2),
                    "z_score": round(z, 2),
                    "sample_size": len(values),
                    "explanation": (
                        f"Total spending of ₹{amount:,.0f} on {d.isoformat()} is "
                        f"{z:.1f} standard deviations above your typical day "
                        f"(₹{mean:,.0f})."
                    ),
                }
            )
    flags.sort(key=lambda f: f["z_score"], reverse=True)
    return flags
