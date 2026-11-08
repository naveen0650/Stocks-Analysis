"""Recorded-sample provider behaviour: listing, windowing, quote math."""

from datetime import date

import pytest

from app.market.providers.recorded import RecordedProvider


@pytest.fixture(scope="module")
def provider() -> RecordedProvider:
    return RecordedProvider()


def test_list_symbols_exposes_both_fixtures(provider):
    symbols = {s["symbol"]: s for s in provider.list_symbols()}
    assert {"RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"} <= set(symbols)
    assert len(symbols) >= 10
    reliance = symbols["RELIANCE.NS"]
    assert reliance["bar_count"] == 131
    assert reliance["bars_from"] == "2026-04-01"
    assert reliance["bars_to"] == "2026-09-30"
    assert reliance["currency"] == "INR"


def test_daily_prices_are_ordered_and_windowed(provider):
    series = provider.get_daily_prices("TCS.NS")
    dates = [bar.date for bar in series.bars]
    assert dates == sorted(dates)
    assert len(series.bars) == 131
    assert series.closes[-1] == pytest.approx(3728.0)

    window = provider.get_daily_prices("TCS.NS", start=date(2026, 9, 1), end=date(2026, 9, 15))
    assert all(date(2026, 9, 1) <= bar.date <= date(2026, 9, 15) for bar in window.bars)
    assert window.bars


def test_unknown_symbol_raises_provider_error(provider):
    with pytest.raises(Exception) as excinfo:
        provider.get_daily_prices("NOPE.NS")
    assert "NOPE.NS" in str(excinfo.value)
    with pytest.raises(Exception):
        provider.get_fundamentals("NOPE.NS")
    with pytest.raises(Exception):
        provider.get_quote("NOPE.NS")


def test_empty_window_raises(provider):
    with pytest.raises(Exception):
        provider.get_daily_prices("TCS.NS", start=date(2030, 1, 1))


def test_quote_is_derived_from_last_two_bars(provider):
    quote = provider.get_quote("TCS.NS")
    series = provider.get_daily_prices("TCS.NS")
    assert quote.price == series.closes[-1]
    assert quote.previous_close == series.closes[-2]
    expected = round((series.closes[-1] / series.closes[-2] - 1) * 100, 2)
    assert quote.change_pct == pytest.approx(expected, abs=1e-6)
    assert quote.as_of == date(2026, 9, 30)
    assert quote.source == "recorded-sample"


def test_fundamentals_carry_what_valuation_needs(provider):
    f = provider.get_fundamentals("TCS.NS")
    assert f.eps_ttm == 140.0
    assert f.eps_growth_pct == 9.0
    assert f.net_debt < 0  # net cash — exercises the negative-net-debt path
    assert f.dividend_per_share and f.dividend_per_share > 0
    assert f.shares_outstanding > 0
