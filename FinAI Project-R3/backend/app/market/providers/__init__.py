"""Provider registry: picks the configured data source.

Settings.MARKET_PROVIDER selects the implementation; "recorded" ships in
this repo and needs no API key. Real providers land here behind the same
FinancialDataProvider interface.
"""

from __future__ import annotations

from app.core.config import get_settings
from app.market.providers.base import FinancialDataProvider
from app.market.providers.recorded import RecordedProvider


def get_provider() -> FinancialDataProvider:
    provider = get_settings().MARKET_PROVIDER
    if provider == "recorded":
        return RecordedProvider()
    raise ValueError(f"Unknown MARKET_PROVIDER '{provider}'.")
