"""Personal-finance entities: categories, expenses, incomes, budgets."""

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base, utcnow

Money = Numeric(14, 2)


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    upi = "upi"
    debit_card = "debit_card"
    credit_card = "credit_card"
    net_banking = "net_banking"
    wallet = "wallet"
    other = "other"


class BudgetPeriod(str, enum.Enum):
    monthly = "monthly"
    yearly = "yearly"


class ExpenseCategory(Base):
    """System categories have user_id NULL; custom ones belong to a user."""

    __tablename__ = "expense_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    expenses: Mapped[list["Expense"]] = relationship(back_populates="category")

    @property
    def is_system(self) -> bool:
        return self.user_id is None


class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        Index("ix_expenses_user_date", "user_id", "expense_date"),
        Index("ix_expenses_user_category", "user_id", "category_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("expense_categories.id"))
    expense_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Money)
    subcategory: Mapped[str | None] = mapped_column(String(80))
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, native_enum=False), default=PaymentMethod.upi
    )
    merchant: Mapped[str | None] = mapped_column(String(120))
    notes: Mapped[str | None] = mapped_column(Text)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    tags: Mapped[str] = mapped_column(String(255), default="")
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    category: Mapped[ExpenseCategory] = relationship(back_populates="expenses")


class Income(Base):
    __tablename__ = "incomes"
    __table_args__ = (Index("ix_incomes_user_date", "user_id", "income_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    income_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Money)
    source: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str | None] = mapped_column(Text)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Budget(Base):
    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("expense_categories.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(120))
    period: Mapped[BudgetPeriod] = mapped_column(Enum(BudgetPeriod, native_enum=False))
    amount: Mapped[Decimal] = mapped_column(Money)
    alert_thresholds: Mapped[list] = mapped_column(JSON, default=lambda: [50, 75, 90])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    category: Mapped[ExpenseCategory | None] = relationship()
