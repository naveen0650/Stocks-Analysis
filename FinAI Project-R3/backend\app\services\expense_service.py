"""Expense, income and category orchestration."""

from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.finance import (
    Budget,
    Expense,
    ExpenseCategory,
    Income,
)
from app.schemas.finance import (
    BudgetCreate,
    BudgetPeriod,
    BudgetStatus,
    BudgetUpdate,
    CategoryCreate,
    ExpenseCreate,
    ExpenseUpdate,
    IncomeCreate,
    IncomeUpdate,
)

DEFAULT_CATEGORIES = [
    "Food",
    "Transport",
    "Housing",
    "Utilities",
    "Shopping",
    "Healthcare",
    "Education",
    "Entertainment",
    "Travel",
    "Insurance",
    "Investments",
    "Miscellaneous",
]


def ensure_system_categories(db: Session) -> None:
    existing = {
        name
        for (name,) in db.execute(
            select(ExpenseCategory.name).where(ExpenseCategory.user_id.is_(None))
        ).all()
    }
    for name in DEFAULT_CATEGORIES:
        if name not in existing:
            db.add(ExpenseCategory(name=name, user_id=None))
    db.commit()


def _serialize_expense(expense: Expense) -> dict:
    return {
        "id": expense.id,
        "category_id": expense.category_id,
        "category_name": expense.category.name,
        "expense_date": expense.expense_date,
        "amount": expense.amount,
        "subcategory": expense.subcategory,
        "payment_method": expense.payment_method,
        "merchant": expense.merchant,
        "notes": expense.notes,
        "is_recurring": expense.is_recurring,
        "tags": [t for t in expense.tags.split(",") if t],
    }


def _resolve_category(db: Session, user_id: int, category_id: int) -> ExpenseCategory:
    category = db.get(ExpenseCategory, category_id)
    if category is None or (category.user_id is not None and category.user_id != user_id):
        raise HTTPException(status_code=404, detail="Category not found.")
    return category


def _parse_tags(tags: list[str] | None) -> str:
    if not tags:
        return ""
    cleaned = [t.strip() for t in tags if t.strip()]
    return ",".join(cleaned[:10])[:255]


def list_expenses(
    db: Session,
    user_id: int,
    *,
    date_from: date | None,
    date_to: date | None,
    category_id: int | None,
    search: str | None,
    page: int,
    page_size: int,
) -> dict:
    stmt = select(Expense).where(
        Expense.user_id == user_id, Expense.is_deleted.is_(False)
    )
    if date_from:
        stmt = stmt.where(Expense.expense_date >= date_from)
    if date_to:
        stmt = stmt.where(Expense.expense_date <= date_to)
    if category_id:
        stmt = stmt.where(Expense.category_id == category_id)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            func.lower(func.coalesce(Expense.merchant, "")).like(like)
            | func.lower(func.coalesce(Expense.notes, "")).like(like)
            | func.lower(func.coalesce(Expense.subcategory, "")).like(like)
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    stmt = stmt.order_by(Expense.expense_date.desc(), Expense.id.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    expenses = db.scalars(stmt).all()
    return {
        "items": [_serialize_expense(e) for e in expenses],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def create_expense(db: Session, user_id: int, payload: ExpenseCreate) -> dict:
    _resolve_category(db, user_id, payload.category_id)
    expense = Expense(
        user_id=user_id,
        category_id=payload.category_id,
        expense_date=payload.expense_date,
        amount=payload.amount,
        subcategory=payload.subcategory,
        payment_method=payload.payment_method,
        merchant=payload.merchant,
        notes=payload.notes,
        is_recurring=payload.is_recurring,
        tags=_parse_tags(payload.tags),
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _serialize_expense(expense)


def get_expense(db: Session, user_id: int, expense_id: int) -> dict:
    expense = db.scalar(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
            Expense.is_deleted.is_(False),
        )
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    return _serialize_expense(expense)


def update_expense(
    db: Session, user_id: int, expense_id: int, payload: ExpenseUpdate
) -> dict:
    expense = db.scalar(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
            Expense.is_deleted.is_(False),
        )
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    data = payload.model_dump(exclude_unset=True)
    if "category_id" in data and data["category_id"] is not None:
        _resolve_category(db, user_id, data["category_id"])
    if "tags" in data:
        data["tags"] = _parse_tags(data["tags"])
    for field, value in data.items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return _serialize_expense(expense)


def delete_expense(db: Session, user_id: int, expense_id: int) -> None:
    expense = db.scalar(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.user_id == user_id,
            Expense.is_deleted.is_(False),
        )
    )
    if expense is None:
        raise HTTPException(status_code=404, detail="Expense not found.")
    expense.is_deleted = True
    db.commit()


def list_categories(db: Session, user_id: int) -> list[dict]:
    stmt = select(ExpenseCategory).where(
        (ExpenseCategory.user_id.is_(None)) | (ExpenseCategory.user_id == user_id)
    )
    categories = db.scalars(stmt.order_by(ExpenseCategory.name)).all()
    return [
        {"id": c.id, "name": c.name, "is_system": c.is_system} for c in categories
    ]


def create_category(db: Session, user_id: int, payload: CategoryCreate) -> dict:
    name = payload.name.strip()
    existing = db.scalar(
        select(ExpenseCategory).where(
            (ExpenseCategory.user_id == user_id)
            & (func.lower(ExpenseCategory.name) == name.lower())
        )
    )
    if existing:
        raise HTTPException(status_code=409, detail="You already have this category.")
    category = ExpenseCategory(name=name, user_id=user_id)
    db.add(category)
    db.commit()
    return {"id": category.id, "name": category.name, "is_system": False}


def delete_category(db: Session, user_id: int, category_id: int) -> None:
    category = db.get(ExpenseCategory, category_id)
    if category is None or category.user_id != user_id:
        raise HTTPException(status_code=404, detail="Category not found.")
    in_use = db.scalar(
        select(func.count())
        .select_from(Expense)
        .where(Expense.category_id == category_id, Expense.is_deleted.is_(False))
    )
    budgeted = db.scalar(
        select(func.count()).select_from(Budget).where(Budget.category_id == category_id)
    )
    if (in_use or 0) > 0 or (budgeted or 0) > 0:
        raise HTTPException(
            status_code=409,
            detail="Category is in use by expenses or budgets and cannot be deleted.",
        )
    db.delete(category)
    db.commit()


# ---------------------------------------------------------------- incomes


def _serialize_income(income: Income) -> dict:
    return {
        "id": income.id,
        "income_date": income.income_date,
        "amount": income.amount,
        "source": income.source,
        "notes": income.notes,
        "is_recurring": income.is_recurring,
    }


def list_incomes(
    db: Session, user_id: int, date_from: date | None, date_to: date | None
) -> list[dict]:
    stmt = select(Income).where(Income.user_id == user_id, Income.is_deleted.is_(False))
    if date_from:
        stmt = stmt.where(Income.income_date >= date_from)
    if date_to:
        stmt = stmt.where(Income.income_date <= date_to)
    incomes = db.scalars(stmt.order_by(Income.income_date.desc())).all()
    return [_serialize_income(i) for i in incomes]


def create_income(db: Session, user_id: int, payload: IncomeCreate) -> dict:
    income = Income(user_id=user_id, **payload.model_dump())
    db.add(income)
    db.commit()
    return _serialize_income(income)


def update_income(
    db: Session, user_id: int, income_id: int, payload: IncomeUpdate
) -> dict:
    income = db.scalar(
        select(Income).where(
            Income.id == income_id,
            Income.user_id == user_id,
            Income.is_deleted.is_(False),
        )
    )
    if income is None:
        raise HTTPException(status_code=404, detail="Income not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(income, field, value)
    db.commit()
    return _serialize_income(income)


def delete_income(db: Session, user_id: int, income_id: int) -> None:
    income = db.scalar(
        select(Income).where(
            Income.id == income_id,
            Income.user_id == user_id,
            Income.is_deleted.is_(False),
        )
    )
    if income is None:
        raise HTTPException(status_code=404, detail="Income not found.")
    income.is_deleted = True
    db.commit()


# ---------------------------------------------------------------- budgets


def _budget_window(period: BudgetPeriod, today: date) -> tuple[date, date]:
    if period == BudgetPeriod.monthly:
        start = today.replace(day=1)
        if today.month == 12:
            next_month = today.replace(year=today.year + 1, month=1, day=1)
        else:
            next_month = today.replace(month=today.month + 1, day=1)
        return start, next_month
    return date(today.year, 1, 1), date(today.year + 1, 1, 1)


def budget_status(db: Session, user_id: int, today: date | None = None) -> list[dict]:
    today = today or date.today()
    budgets = db.scalars(
        select(Budget).where(Budget.user_id == user_id).order_by(Budget.id)
    ).all()
    statuses = []
    for b in budgets:
        start, end = _budget_window(BudgetPeriod(b.period), today)
        stmt = select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.user_id == user_id,
            Expense.is_deleted.is_(False),
            Expense.expense_date >= start,
            Expense.expense_date < end,
        )
        if b.category_id is not None:
            stmt = stmt.where(Expense.category_id == b.category_id)
        actual = Decimal(db.scalar(stmt) or 0)
        utilization = float(actual / b.amount * 100) if b.amount else 0.0
        triggered = [
            t
            for t in sorted(b.alert_thresholds or [])
            if utilization >= t
        ]
        statuses.append(
            {
                "id": b.id,
                "name": b.name,
                "period": b.period,
                "category_id": b.category_id,
                "category_name": b.category.name if b.category else None,
                "amount": b.amount,
                "actual": actual,
                "remaining": b.amount - actual,
                "utilization_pct": round(utilization, 1),
                "triggered_alerts": triggered,
                "is_active": b.is_active,
            }
        )
    return statuses


def list_budgets(db: Session, user_id: int) -> list[dict]:
    return budget_status(db, user_id)


def create_budget(db: Session, user_id: int, payload: BudgetCreate) -> dict:
    if payload.category_id is not None:
        _resolve_category(db, user_id, payload.category_id)
    thresholds = sorted({t for t in payload.alert_thresholds if 0 < t <= 200})
    budget = Budget(
        user_id=user_id,
        category_id=payload.category_id,
        name=payload.name.strip(),
        period=payload.period,
        amount=payload.amount,
        alert_thresholds=thresholds or [50, 75, 90],
    )
    db.add(budget)
    db.commit()
    return budget_status_row(db, user_id, budget)


def budget_status_row(db: Session, user_id: int, budget: Budget) -> dict:
    for row in budget_status(db, user_id):
        if row["id"] == budget.id:
            return row
    return {"id": budget.id}


def update_budget(
    db: Session, user_id: int, budget_id: int, payload: BudgetUpdate
) -> dict:
    budget = db.scalar(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found.")
    data = payload.model_dump(exclude_unset=True)
    if "alert_thresholds" in data and data["alert_thresholds"] is not None:
        data["alert_thresholds"] = sorted(
            {t for t in data["alert_thresholds"] if 0 < t <= 200}
        )
    for field, value in data.items():
        setattr(budget, field, value)
    db.commit()
    return budget_status_row(db, user_id, budget)


def delete_budget(db: Session, user_id: int, budget_id: int) -> None:
    budget = db.scalar(
        select(Budget).where(Budget.id == budget_id, Budget.user_id == user_id)
    )
    if budget is None:
        raise HTTPException(status_code=404, detail="Budget not found.")
    db.delete(budget)
    db.commit()
