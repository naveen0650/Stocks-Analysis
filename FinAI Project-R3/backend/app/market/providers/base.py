"""Provider abstraction for external market data.

The rest of the app depends only on `FinancialDataProvider`; concrete
providers (recorded fixtures today, Alpha Vantage / Twelve Data / FMP once
an API key is configured) plug in behind the same interface. All money and
per-share values a provider returns are floats in the currency named on the
payload; aggregate fundamentals are in currency crores.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date


class ProviderError(Exception):
    """Symbol unknown or provider data unavailable. Routes map this to a
    404 rather than fabricating values."""


@dataclass(frozen=True)
class PriceBar:
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass(frozen=True)
class PriceSeries:
    symbol: str
    currency: str
    source: str
    bars: list[PriceBar]

    @property
    def closes(self) -> list[float]:
        return [bar.close for bar in self.bars]


@dataclass(frozen=True)
class Quote:
    symbol: str
    price: float | None
    previous_close: float | None
    change_pct: float | None
    currency: str
    as_of: date | None
    source: str


@dataclass(frozen=True)
class Fundamentals:
    symbol: str
    currency: str
    source: str
    as_of: date | None
    sector: str | None
    name: str | None
    shares_outstanding: float  # currency crores
    eps_ttm: float  # per share
    eps_growth_pct: float | None  # YoY EPS growth, for PEG
    book_value_per_share: float | None
    dividend_per_share: float | None
    revenue_ttm: float  # currency crores
    ebitda_ttm: float  # currency crores
    net_debt: float  # currency crores
    free_cash_flow_ttm: float  # currency crores
    roe_pct: float | None


class FinancialDataProvider(ABC):
    """Read-only market data source. Implementations must raise
    ProviderError for unknown symbols and must never invent missing
    values — return None fields and let the callers degrade visibly."""

    name: str = "abstract"

    @abstractmethod
    def list_symbols(self) -> list[dict]:
        """Symbols this provider can currently serve."""

    @abstractmethod
    def get_daily_prices(
        self, symbol: str, start: date | None = None, end: date | None = None
    ) -> PriceSeries:
        """End-of-day OHLCV bars, oldest first, inclusive of bounds."""

    @abstractmethod
    def get_quote(self, symbol: str) -> Quote: ...

    @abstractmethod
    def get_fundamentals(self, symbol: str) -> Fundamentals: ...
