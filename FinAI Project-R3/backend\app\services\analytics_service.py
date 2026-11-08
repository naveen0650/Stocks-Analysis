"""Analytics orchestration: fetches the user's rows and feeds the pure
analytics engine. Responses always annotate the window and freshness of the
underlying data."""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics import aggregation, anomaly, insights
from app.analytics import health_score as health_score_engine
from app.models.finance import Budget, Expense, ExpenseCategory, Income
from app.services.expense_service import budget_status


def _expense_rows(
    db: Session, user_id: int, date_from: date, date_to: date
) -> list[Expense]:
    stmt = (
        select(Expense)
        .where(
            Expense.user_id == user_id,
            Expense.is_deleted.is_(False),
            Expense.expense_date >= date_from,
            Expense.expense_date <= date_to,
        )
        .order_by(Expense.expense_date)
    )
    return list(db.scalars(stmt))


def _income_rows(
    db: Session, user_id: int, date_from: date, date_to: date
) -> list[Income]:
    stmt = (
        select(Income)
        .where(
            Income.user_id == user_id,
            Income.is_deleted.is_(False),
            Income.income_date >= date_from,
            Income.income_date <= date_to,
        )
        .order_by(Income.income_date)
    )
    return list(db.scalars(stmt))


def _category_names(db: Session) -> dict[int, str]:
    return {
        c.id: c.name
        for c in db.scalars(select(ExpenseCategory)).all()
    }


def _month_category_matrix(
    expense_items: list[Expense], names: dict[int, str]
) -> dict[str, dict[str, Decimal]]:
    matrix: dict[str, dict[str, Decimal]] = {}
    for e in expense_items:
        key = aggregation.month_key(e.expense_date)
        matrix.setdefault(key, {})
        name = names.get(e.category_id, f"category-{e.category_id}")
        matrix[key][name] = matrix[key].get(name, Decimal(0)) + e.amount
    return matrix


def summary(db: Session, user_id: int, date_from: date, date_to: date) -> dict:
    expenses = _expense_rows(db, user_id, date_from, date_to)
    incomes = _income_rows(db, user_id, date_from, date_to)
    expense_total = sum((e.amount for e in expenses), Decimal(0))
    income_total = sum((i.amount for i in incomes), Decimal(0))
    savings = income_total - expense_total
    savings_rate = (
        float(savings / income_total * 100) if income_total > 0 else None
    )
    return {
        "window": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "total_income": float(income_total),
        "total_expenses": float(expense_total),
        "savings": float(savings),
        "savings_rate_pct": round(savings_rate, 1) if savings_rate is not None else None,
        "transaction_count": len(expenses),
    }


def trends(db: Session, user_id: int, months: int = 12) -> dict:
    today = date.today()
    start = (today.replace(day=1) - timedelta(days=months * 31)).replace(day=1)
    expenses = _expense_rows(db, user_id, start, today)
    incomes = _income_rows(db, user_id, start, today)

    expense_series = aggregation.monthly_series(
        [(e.expense_date, e.amount) for e in expenses], months
    )
    income_series = aggregation.monthly_series(
        [(i.income_date, i.amount) for i in incomes], months
    )
    income_map = {s["month"]: s["total"] for s in income_series}
    merged = [
        {
            "month": s["month"],
            "expenses": s["total"],
            "income": income_map.get(s["month"], 0.0),
            "savings": round(income_map.get(s["month"], 0.0) - s["total"], 2),
        }
        for s in expense_series
    ]
    return {
        "monthly": merged,
        "expense_mom_pct": aggregation.mom_delta(expense_series),
        "window": {"from": start.isoformat(), "to": today.isoformat()},
    }


def categories(db: Session, user_id: int, date_from: date, date_to: date) -> dict:
    expenses = _expense_rows(db, user_id, date_from, date_to)
    names = _category_names(db)
    distribution = aggregation.category_distribution(
        [(names.get(e.category_id, "?"), e.amount) for e in expenses]
    )

    by_merchant: dict[str, Decimal] = {}
    for e in expenses:
        if e.merchant:
            by_merchant[e.merchant] = by_merchant.get(e.merchant, Decimal(0)) + e.amount
    top_merchants = [
        {"merchant": m, "total": float(v)}
        for m, v in sorted(by_merchant.items(), key=lambda kv: kv[1], reverse=True)[:5]
    ]
    return {
        "window": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "distribution": distribution,
        "top_merchants": top_merchants,
    }


def _build_expense_dicts(expenses: list[Expense], names: dict[int, str]) -> list[dict]:
    return [
        {
            "expense_id": e.id,
            "date": e.expense_date,
            "amount": e.amount,
            "category": names.get(e.category_id, "?"),
            "merchant": e.merchant,
        }
        for e in expenses
    ]


def anomalies(db: Session, user_id: int, days: int = 90) -> dict:
    today = date.today()
    start = today - timedelta(days=days)
    expenses = _expense_rows(db, user_id, start, today)
    names = _category_names(db)
    rows = _build_expense_dicts(expenses, names)
    txn_flags = anomaly.transaction_anomalies(rows)
    daily_flags = anomaly.daily_total_anomalies(
        [(e.expense_date, e.amount) for e in expenses]
    )
    return {
        "window": {"from": start.isoformat(), "to": today.isoformat()},
        "flags": (txn_flags + daily_flags)[:20],
        "analyzed_transactions": len(rows),
    }


def insights_payload(db: Session, user_id: int) -> dict:
    today = date.today()
    start = (today.replace(day=1) - timedelta(days=95)).replace(day=1)
    expenses = _expense_rows(db, user_id, start, today)
    names = _category_names(db)
    matrix = _month_category_matrix(expenses, names)
    current_month = aggregation.month_key(today)
    distribution = aggregation.category_distribution(
        list(matrix.get(current_month, {}).items())
    )

    incomes = _income_rows(db, user_id, start, today)
    monthly_income = aggregation.sum_by_month(
        [(i.income_date, i.amount) for i in incomes]
    )
    monthly_expense = aggregation.sum_by_month(
        [(e.expense_date, e.amount) for e in expenses]
    )

    payloads = insights.generate_insights(
        monthly_category_totals=matrix,
        distribution=distribution,
        expense_rows=_build_expense_dicts(expenses, names),
        monthly_income=monthly_income,
        monthly_expense=monthly_expense,
        budget_statuses=budget_status(db, user_id, today),
    )
    return {
        "generated_at": today.isoformat(),
        "insights": payloads,
        "data_window": {"from": start.isoformat(), "to": today.isoformat()},
    }


def health_score(db: Session, user_id: int, window_days: int = 90) -> dict:
    today = date.today()
    start = today - timedelta(days=window_days)
    expenses = _expense_rows(db, user_id, start, today)
    incomes = _income_rows(db, user_id, start, today)

    expense_total = sum((e.amount for e in expenses), Decimal(0))
    income_total = sum((i.amount for i in incomes), Decimal(0))
    savings = income_total - expense_total

    savings_rate = (
        float(savings / income_total * 100) if income_total > 0 else None
    )
    expense_ratio = (
        float(expense_total / income_total) if income_total > 0 else None
    )

    recurring_total = sum(
        (e.amount for e in expenses if e.is_recurring), Decimal(0)
    )
    recurring_ratio = (
        float(recurring_total / expense_total * 100) if expense_total > 0 else None
    )

    budgets = db.scalars(
        select(Budget).where(Budget.user_id == user_id, Budget.is_active.is_(True))
    ).all()
    utilization = None
    if budgets:
        utilizations = []
        for b in budgets:
            if not b.amount:
                continue
            month_start = today.replace(day=1)
            month_expenses = sum(
                (
                    e.amount
                    for e in expenses
                    if e.expense_date >= month_start
                    and (b.category_id is None or e.category_id == b.category_id)
                ),
                Decimal(0),
            )
            utilizations.append(float(month_expenses / b.amount * 100))
        utilization = sum(utilizations) / len(utilizations)

    # Emergency-fund proxy: net recorded savings vs average monthly expenses.
    emergency_months = None
    monthly_avg_expense = float(expense_total) / max(window_days / 30.0, 1)
    if monthly_avg_expense > 0:
        emergency_months = max(0.0, float(savings)) / monthly_avg_expense

    result = health_score_engine.compute_health_score(
        savings_rate_pct=savings_rate,
        expense_to_income=expense_ratio,
        budget_utilization_pct=utilization,
        recurring_ratio_pct=recurring_ratio,
        emergency_fund_months=emergency_months if emergency_months is not None else None,
        window_days=window_days,
    )
    result["inputs"] = {
        "savings_rate_pct": round(savings_rate, 1) if savings_rate is not None else None,
        "expense_to_income": (
            round(expense_ratio, 3) if expense_ratio is not None else None
        ),
        "budget_utilization_pct": (
            round(utilization, 1) if utilization is not None else None
        ),
        "recurring_ratio_pct": (
            round(recurring_ratio, 1) if recurring_ratio is not None else None
        ),
        "emergency_fund_months": (
            round(emergency_months, 1) if emergency_months is not None else None
        ),
    }
    return result


def dashboard(db: Session, user_id: int) -> dict:
    today = date.today()
    month_start = today.replace(day=1)
    month_summary = summary(db, user_id, month_start, today)
    year_start = date(today.year, 1, 1)
    year_summary = summary(db, user_id, year_start, today)

    recent = db.scalars(
        select(Expense)
        .where(
            Expense.user_id == user_id,
            Expense.is_deleted.is_(False),
            Expense.expense_date >= today - timedelta(days=7),
        )
        .order_by(Expense.expense_date.desc())
        .limit(50)
    ).all()
    names = _category_names(db)
    today_total = sum(
        (e.amount for e in recent if e.expense_date == today), Decimal(0)
    )
    month_categories = categories(db, user_id, month_start, today)["distribution"]

    return {
        "generated_for": today.isoformat(),
        "month": {
            **month_summary,
            "top_category": month_categories[0] if month_categories else None,
        },
        "year": year_summary,
        "today_expense_total": float(today_total),
        "trends": trends(db, user_id, months=6),
        "recent_expenses": [
            {
                "id": e.id,
                "category": names.get(e.category_id, "?"),
                "amount": float(e.amount),
                "merchant": e.merchant,
                "date": e.expense_date.isoformat(),
            }
            for e in recent[:8]
        ],
        "budgets": budget_status(db, user_id, today),
        "insights": insights_payload(db, user_id)["insights"],
        "health": health_score(db, user_id),
        "data_freshness": {"expenses_as_of": today.isoformat()},
    }
