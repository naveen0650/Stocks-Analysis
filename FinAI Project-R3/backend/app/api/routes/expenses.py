"""Expense, category, income and budget endpoints."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.ratelimit import key_rate_limit
from app.db.session import get_db
from app.models.user import User
from app.schemas.finance import (
    BudgetCreate,
    BudgetPeriod,
    BudgetUpdate,
    CategoryCreate,
    CategoryOut,
    ExpenseCreate,
    ExpensePage,
    ExpenseUpdate,
    IncomeCreate,
    IncomeOut,
    IncomeUpdate,
)
from app.services import expense_service

router = APIRouter(tags=["expenses"])


def _guard(user: User) -> None:
    key_rate_limit(f"u{user.id}", "mutate", 120, 60)


# ------------------------------------------------------------------ expenses


@router.get("/expenses", response_model=ExpensePage)
def list_expenses(
    date_from: date | None = None,
    date_to: date | None = None,
    category_id: int | None = None,
    q: str | None = Query(default=None, max_length=120),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return expense_service.list_expenses(
        db,
        user.id,
        date_from=date_from,
        date_to=date_to,
        category_id=category_id,
        search=q,
        page=page,
        page_size=page_size,
    )


@router.post("/expenses", status_code=201)
def create_expense(
    payload: ExpenseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _guard(user)
    return expense_service.create_expense(db, user.id, payload)


@router.get("/expenses/{expense_id}")
def get_expense(
    expense_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    return expense_service.get_expense(db, user.id, expense_id)


@router.patch("/expenses/{expense_id}")
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _guard(user)
    return expense_service.update_expense(db, user.id, expense_id, payload)


@router.delete("/expenses/{expense_id}")
def delete_expense(
    expense_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _guard(user)
    expense_service.delete_expense(db, user.id, expense_id)
    return {"message": "Expense deleted."}


# ---------------------------------------------------------------- categories


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return expense_service.list_categories(db, user.id)


@router.post("/categories", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _guard(user)
    return expense_service.create_category(db, user.id, payload)


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _guard(user)
    expense_service.delete_category(db, user.id, category_id)
    return {"message": "Category deleted."}


# ------------------------------------------------------------------- incomes


@router.get("/incomes", response_model=list[IncomeOut])
def list_incomes(
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return expense_service.list_incomes(db, user.id, date_from, date_to)


@router.post("/incomes", response_model=IncomeOut, status_code=201)
def create_income(
    payload: IncomeCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _guard(user)
    return expense_service.create_income(db, user.id, payload)


@router.patch("/incomes/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: int,
    payload: IncomeUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _guard(user)
    return expense_service.update_income(db, user.id, income_id, payload)


@router.delete("/incomes/{income_id}")
def delete_income(
    income_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _guard(user)
    expense_service.delete_income(db, user.id, income_id)
    return {"message": "Income deleted."}


# ------------------------------------------------------------------- budgets


@router.get("/budgets")
def list_budgets(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return expense_service.list_budgets(db, user.id)


@router.post("/budgets", status_code=201)
def create_budget(
    payload: BudgetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _guard(user)
    return expense_service.create_budget(db, user.id, payload)


@router.patch("/budgets/{budget_id}")
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _guard(user)
    return expense_service.update_budget(db, user.id, budget_id, payload)


@router.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    _guard(user)
    expense_service.delete_budget(db, user.id, budget_id)
    return {"message": "Budget deleted."}
