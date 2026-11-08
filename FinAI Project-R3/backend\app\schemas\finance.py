"""Finance request/response schemas."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.finance import BudgetPeriod, PaymentMethod


class CategoryOut(BaseModel):
    id: int
    name: str
    is_system: bool

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class ExpenseCreate(BaseModel):
    category_id: int
    expense_date: date
    amount: Decimal = Field(gt=0, decimal_places=2)
    subcategory: str | None = Field(default=None, max_length=80)
    payment_method: PaymentMethod = PaymentMethod.upi
    merchant: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    is_recurring: bool = False
    tags: list[str] = Field(default_factory=list, max_length=10)


class ExpenseUpdate(BaseModel):
    category_id: int | None = None
    expense_date: date | None = None
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    subcategory: str | None = Field(default=None, max_length=80)
    payment_method: PaymentMethod | None = None
    merchant: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    is_recurring: bool | None = None
    tags: list[str] | None = Field(default=None, max_length=10)


class ExpenseOut(BaseModel):
    id: int
    category_id: int
    category_name: str
    expense_date: date
    amount: Decimal
    subcategory: str | None
    payment_method: PaymentMethod
    merchant: str | None
    notes: str | None
    is_recurring: bool
    tags: list[str]

    model_config = {"from_attributes": True}


class ExpensePage(BaseModel):
    items: list[ExpenseOut]
    total: int
    page: int
    page_size: int


class IncomeCreate(BaseModel):
    income_date: date
    amount: Decimal = Field(gt=0, decimal_places=2)
    source: str = Field(min_length=1, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    is_recurring: bool = False


class IncomeUpdate(BaseModel):
    income_date: date | None = None
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    source: str | None = Field(default=None, min_length=1, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    is_recurring: bool | None = None


class IncomeOut(BaseModel):
    id: int
    income_date: date
    amount: Decimal
    source: str
    notes: str | None
    is_recurring: bool

    model_config = {"from_attributes": True}


class BudgetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category_id: int | None = None
    period: BudgetPeriod = BudgetPeriod.monthly
    amount: Decimal = Field(gt=0, decimal_places=2)
    alert_thresholds: list[int] = Field(default_factory=lambda: [50, 75, 90])


class BudgetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    amount: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    alert_thresholds: list[int] | None = None
    is_active: bool | None = None


class BudgetStatus(BaseModel):
    id: int
    name: str
    period: BudgetPeriod
    category_id: int | None
    category_name: str | None
    amount: Decimal
    actual: Decimal
    remaining: Decimal
    utilization_pct: float
    triggered_alerts: list[int]
    is_active: bool

    model_config = {"from_attributes": True}
