"""Unit tests for the pure analytics engine (no I/O)."""

from datetime import date
from decimal import Decimal

from app.analytics import aggregation, anomaly, health_score, insights


def d(day: int) -> date:
    return date(2026, 9, day)


# ------------------------------------------------------------- aggregation


def test_sum_by_month_buckets_correctly():
    rows = [(d(1), Decimal("100")), (d(20), Decimal("50")), (date(2026, 8, 3), Decimal("70"))]
    totals = aggregation.sum_by_month(rows)
    assert totals["2026-09"] == Decimal("150")
    assert totals["2026-08"] == Decimal("70")


def test_monthly_series_fills_gaps():
    rows = [(d(1), Decimal("10")), (date(2026, 7, 5), Decimal("30"))]
    series = aggregation.monthly_series(rows, months=3)
    months = [s["month"] for s in series]
    assert months == ["2026-07", "2026-08", "2026-09"]
    assert series[2]["total"] == 10.0
    assert series[1]["total"] == 0.0


def test_mom_delta():
    series = [
        {"month": "2026-07", "total": 100.0},
        {"month": "2026-08", "total": 150.0},
    ]
    assert aggregation.mom_delta(series) == 50.0
    assert aggregation.mom_delta(series[:1]) is None
    assert aggregation.mom_delta(
        [{"month": "2026-07", "total": 0.0}, {"month": "2026-08", "total": 50.0}]
    ) is None


def test_category_distribution_sorted_by_share():
    rows = [("Food", Decimal("300")), ("Rent", Decimal("700"))]
    dist = aggregation.category_distribution(rows)
    assert dist[0]["category"] == "Rent"
    assert dist[0]["share_pct"] == 70.0
    assert dist[1]["share_pct"] == 30.0


def test_weekend_split():
    # 2026-09-05 is a Saturday, 2026-09-07 a Monday.
    rows = [
        (date(2026, 9, 5), Decimal("100")),
        (date(2026, 9, 6), Decimal("100")),
        (date(2026, 9, 7), Decimal("50")),
        (date(2026, 9, 8), Decimal("50")),
    ]
    split = aggregation.weekend_weekday_split(rows)
    assert split["weekend_daily_avg"] == 100.0
    assert split["weekday_daily_avg"] == 50.0


def test_recurring_merchant_detection():
    rows = [
        {"merchant": "Netflix", "amount": 499, "date": date(2026, 7, 5)},
        {"merchant": "netflix", "amount": 499, "date": date(2026, 8, 5)},
        {"merchant": "Netflix", "amount": 499, "date": date(2026, 9, 5)},
        {"merchant": "Netflix", "amount": 499, "date": date(2026, 6, 5)},
    ]
    recurring = aggregation.recurring_merchants(rows, min_occurrences=3)
    assert len(recurring) == 1
    assert recurring[0]["months"] == 4


# ----------------------------------------------------------------- anomaly


def _txn(amount, day, category="Food", eid=1, merchant=None):
    return {
        "expense_id": eid,
        "date": d(day),
        "amount": Decimal(str(amount)),
        "category": category,
        "merchant": merchant,
    }


def test_transaction_anomaly_flagged_and_explained():
    rows = [_txn(100, i + 1, eid=i + 1) for i in range(10)]
    rows.append(_txn(1000, 15, eid=11))
    flags = anomaly.transaction_anomalies(rows)
    assert len(flags) == 1
    flag = flags[0]
    assert flag["expense_id"] == 11
    assert flag["z_score"] > 2.5
    assert "standard deviations" in flag["explanation"]
    assert flag["sample_size"] == 11


def test_small_sample_guard_prevents_flags():
    rows = [_txn(100, i + 1, eid=i + 1) for i in range(5)]
    rows.append(_txn(5000, 10, eid=6))
    assert anomaly.transaction_anomalies(rows) == []


def test_daily_total_anomaly_requires_history():
    assert anomaly.daily_total_anomalies([(d(1), Decimal("100"))]) == []

    rows = [(date(2026, 8, i + 1), Decimal("100")) for i in range(20)]
    rows.append((d(5), Decimal("900")))
    flags = anomaly.daily_total_anomalies(rows)
    assert len(flags) == 1
    assert flags[0]["kind"] == "daily_total"


# ---------------------------------------------------------------- insights


def test_category_spike_rule():
    matrix = {
        "2026-08": {"food": Decimal("1000")},
        "2026-09": {"food": Decimal("1600")},  # +60%, +600 >= 500
    }
    result = insights.category_spikes(matrix)
    assert len(result) == 1
    assert result[0]["evidence"]["change_pct"] == 60.0


def test_spike_below_delta_threshold_is_silent():
    matrix = {
        "2026-08": {"food": Decimal("10000")},
        "2026-09": {"food": Decimal("10500")},  # +5% only
    }
    assert insights.category_spikes(matrix) == []


def test_concentration_rule():
    dist = [{"category": "rent", "total": 800.0, "share_pct": 40.0}]
    result = insights.spending_concentration(dist)
    assert len(result) == 1
    assert "dominates" in result[0]["title"]


def test_weekend_pattern_rule_requires_enough_data():
    few_rows = [{"date": d(5), "amount": Decimal("100")}] * 5
    assert insights.weekend_pattern(few_rows) == []


def test_budget_pressure_rule():
    statuses = [
        {
            "id": 1,
            "name": "Food",
            "amount": 1000,
            "actual": 1050,
            "utilization_pct": 105.0,
            "triggered_alerts": [50, 75, 90, 100],
            "is_active": True,
        }
    ]
    result = insights.budget_pressure(statuses)
    assert result[0]["severity"] == "critical"
    assert "exceeded" in result[0]["title"]


def test_generate_insights_orders_by_severity():
    matrix = {
        "2026-08": {"food": Decimal("1000")},
        "2026-09": {"food": Decimal("2000")},
    }
    dist = [{"category": "food", "total": 2000.0, "share_pct": 80.0}]
    result = insights.generate_insights(
        monthly_category_totals=matrix,
        distribution=dist,
        expense_rows=[],
        monthly_income={},
        monthly_expense={},
        budget_statuses=[],
    )
    severities = [i["severity"] for i in result]
    assert severities == sorted(severities, key={"critical": 0, "warning": 1, "info": 2}.get)


# ------------------------------------------------------------ health score


def test_health_score_all_factors_evaluated():
    result = health_score.compute_health_score(
        savings_rate_pct=20.0,
        expense_to_income=0.5,
        budget_utilization_pct=85.0,
        recurring_ratio_pct=30.0,
        emergency_fund_months=6.0,
        diversification_pct=100.0,
    )
    assert result["score"] == 100
    assert result["grade"] == "Excellent"
    assert all(f["status"] == "evaluated" for f in result["factors"])


def test_weight_redistribution_when_factors_missing():
    full = health_score.compute_health_score(
        savings_rate_pct=10.0,
        expense_to_income=0.75,
        budget_utilization_pct=100.0,
        recurring_ratio_pct=45.0,
        emergency_fund_months=3.0,
        diversification_pct=100.0,
    )
    partial = health_score.compute_health_score(
        savings_rate_pct=10.0,
        expense_to_income=0.75,
        budget_utilization_pct=None,
        recurring_ratio_pct=None,
        emergency_fund_months=3.0,
        diversification_pct=None,
    )
    not_evaluated = [f for f in partial["factors"] if f["status"] == "not_evaluated"]
    assert len(not_evaluated) == 3
    contributions = sum(f["contribution"] or 0 for f in partial["factors"])
    assert round(contributions) == partial["score"]
    # The same evaluated factors contribute more after redistribution.
    full_food = next(f for f in full["factors"] if f["key"] == "savings_rate")
    partial_food = next(f for f in partial["factors"] if f["key"] == "savings_rate")
    assert partial_food["effective_weight"] > full_food["effective_weight"]


def test_score_bounds():
    result = health_score.compute_health_score(
        savings_rate_pct=-10.0,
        expense_to_income=2.0,
        budget_utilization_pct=200.0,
        recurring_ratio_pct=90.0,
        emergency_fund_months=0.0,
        diversification_pct=0.0,
    )
    assert 0 <= result["score"] <= 100
    assert result["grade"] == "At Risk"
