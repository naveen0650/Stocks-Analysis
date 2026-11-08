"""Stock-analysis orchestration: provider data in, one explainable
analysis payload out (indicators + valuation + score)."""

from __future__ import annotations

from app.market import fair_value, indicators, scoring, sentiment
from app.market.providers import get_provider
from app.market.providers.base import Fundamentals, PriceSeries, ProviderError
from app.market.valuation import (
    DcfAssumptions,
    ValuationInputError,
    dcf_sensitivity,
    dcf_valuation,
    ev_ebitda_fair_value,
    gordon_growth_model,
    pe_fair_value,
    peg_assessment,
    scenario_valuations,
)
from app.schemas.market import ValuationAssumptions

TRADING_DAYS_1M = 21
TRADING_DAYS_3M = 63
TRADING_DAYS_6M = 126

DISCLAIMER = (
    "Analysis is generated from recorded sample data for education and "
    "research only and is not investment advice."
)

SENSITIVITY_WACC_VALUES = [9.0, 10.0, 11.0, 12.0, 13.0]
SENSITIVITY_GROWTH_VALUES = [2.0, 3.0, 4.0, 5.0, 6.0]


def _chart_series(series: PriceSeries) -> dict:
    closes = series.closes
    sma20 = indicators.sma(closes, 20)
    sma50 = indicators.sma(closes, 50)
    bands = indicators.bollinger_bands(closes, 20, 2.0)
    return {
        "dates": [bar.date.isoformat() for bar in series.bars],
        "close": closes,
        "sma_20": sma20,
        "sma_50": sma50,
        "bollinger_upper": bands["upper"],
        "bollinger_lower": bands["lower"],
    }


def _indicator_summary(series: PriceSeries) -> dict:
    closes = series.closes
    sma20 = indicators.sma(closes, 20)
    sma50 = indicators.sma(closes, 50)
    rsi = indicators.rsi(closes, 14)
    macd = indicators.macd(closes)
    bands = indicators.bollinger_bands(closes, 20, 2.0)
    last = closes[-1]
    window_6m = closes[-TRADING_DAYS_6M:]

    def _last(seq):
        return seq[-1] if seq else None

    return {
        "sma_20": _last(sma20),
        "sma_50": _last(sma50),
        "price_vs_sma_20_pct": (
            round((last / sma20[-1] - 1.0) * 100.0, 2)
            if sma20[-1]
            else None
        ),
        "rsi_14": _last(rsi),
        "macd": {
            "line": _last(macd["macd"]),
            "signal": _last(macd["signal"]),
            "histogram": _last(macd["histogram"]),
        },
        "bollinger": {
            "upper": _last(bands["upper"]),
            "middle": _last(bands["middle"]),
            "lower": _last(bands["lower"]),
        },
        "returns_pct": {
            "month_1": indicators.trailing_return(closes, TRADING_DAYS_1M),
            "months_3": indicators.trailing_return(closes, TRADING_DAYS_3M),
            "months_6": (
                indicators.trailing_return(closes, TRADING_DAYS_6M)
                if len(closes) >= TRADING_DAYS_6M + 1
                else None
            ),
        },
        "max_drawdown_pct": indicators.max_drawdown(window_6m),
        "annualized_volatility_pct": indicators.annualized_volatility(window_6m),
    }


def _method_rows(
    fundamentals: Fundamentals, price: float, a: ValuationAssumptions
) -> tuple[list[dict], dict, dict | None]:
    """One row per valuation method with its fair value and upside."""
    dcf = dcf_valuation(
        fundamentals.free_cash_flow_ttm,
        fundamentals.net_debt,
        fundamentals.shares_outstanding,
        DcfAssumptions(
            projection_years=a.projection_years,
            stage1_growth_pct=a.stage1_growth_pct,
            terminal_growth_pct=a.terminal_growth_pct,
            wacc_pct=a.wacc_pct,
        ),
    )

    def _row(method, fair, note):
        return {
            "method": method,
            "fair_value_per_share": round(fair, 4),
            "upside_pct": round((fair / price - 1.0) * 100.0, 2),
            "note": note,
        }

    rows = [
        _row(
            "dcf",
            dcf["fair_value_per_share"],
            "PV of 5y FCF + Gordon terminal value, less net debt",
        )
    ]
    if fundamentals.eps_ttm > 0:
        rows.append(
            _row(
                "pe",
                pe_fair_value(fundamentals.eps_ttm, a.pe_target),
                f"{a.pe_target:.0f}x target P/E on TTM EPS",
            )
        )
    rows.append(
        _row(
            "ev_ebitda",
            ev_ebitda_fair_value(
                fundamentals.ebitda_ttm,
                a.ev_ebitda_target,
                fundamentals.net_debt,
                fundamentals.shares_outstanding,
            ),
            f"{a.ev_ebitda_target:.0f}x target EV/EBITDA less net debt",
        )
    )
    ddm = gordon_growth_model(
        fundamentals.dividend_per_share, a.required_return_pct, a.ddm_growth_pct
    )
    if ddm is not None:
        rows.append(
            _row(
                "ddm",
                ddm,
                "Gordon growth on DPS at required return "
                f"{a.required_return_pct:.0f}%",
            )
        )
    if fundamentals.eps_growth_pct and fundamentals.eps_ttm > 0:
        peg = peg_assessment(
            price / fundamentals.eps_ttm, fundamentals.eps_growth_pct
        )
        rows.append(
            _row(
                "peg_implied",
                peg["implied_fair_pe"] * fundamentals.eps_ttm,
                f"PEG benchmark implies {peg['implied_fair_pe']:.0f}x P/E "
                f"(actual PEG {peg['peg']:.2f})",
            )
        )
    return rows, dcf, (
        peg_assessment(price / fundamentals.eps_ttm, fundamentals.eps_growth_pct)
        if fundamentals.eps_growth_pct and fundamentals.eps_ttm > 0
        else None
    )


def build_valuation(
    fundamentals: Fundamentals, price: float, a: ValuationAssumptions
) -> dict:
    rows, dcf, peg = _method_rows(fundamentals, price, a)
    available = [r["fair_value_per_share"] for r in rows]
    blended = sum(available) / len(available) if available else None

    payload: dict = {
        "price_used": price,
        "methods": rows,
        "blended_fair_value_per_share": round(blended, 4) if blended else None,
        "blended_upside_pct": (
            round((blended / price - 1.0) * 100.0, 2) if blended else None
        ),
        "dcf": dcf,
        "sensitivity": dcf_sensitivity(
            fundamentals.free_cash_flow_ttm,
            fundamentals.net_debt,
            fundamentals.shares_outstanding,
            SENSITIVITY_WACC_VALUES,
            SENSITIVITY_GROWTH_VALUES,
            base=DcfAssumptions(**dcf["assumptions"]),
        ),
        "scenarios": scenario_valuations(
            fundamentals={
                "free_cash_flow_ttm": fundamentals.free_cash_flow_ttm,
                "net_debt": fundamentals.net_debt,
                "shares_outstanding": fundamentals.shares_outstanding,
                "eps_ttm": fundamentals.eps_ttm,
                "ebitda_ttm": fundamentals.ebitda_ttm,
                "dividend_per_share": fundamentals.dividend_per_share,
            },
            price=price,
            base=DcfAssumptions(
                projection_years=a.projection_years,
                stage1_growth_pct=a.stage1_growth_pct,
                terminal_growth_pct=a.terminal_growth_pct,
                wacc_pct=a.wacc_pct,
            ),
            pe_target=a.pe_target,
            ev_ebitda_target=a.ev_ebitda_target,
            ddm_growth_pct=a.ddm_growth_pct,
            required_return_pct=a.required_return_pct,
        ),
        "peg_assessment": peg,
    }
    return payload


def analyze_symbol(
    symbol: str, assumptions: ValuationAssumptions | None = None
) -> dict:
    provider = get_provider()
    assumptions = assumptions or ValuationAssumptions()

    prices = provider.get_daily_prices(symbol)
    fundamentals = provider.get_fundamentals(symbol)
    quote = provider.get_quote(symbol)

    last_bar = prices.bars[-1]
    price = quote.price if quote.price is not None else last_bar.close

    summary = _indicator_summary(prices)
    valuation = build_valuation(fundamentals, price, assumptions)

    peg_value = None
    if valuation["peg_assessment"]:
        peg_value = valuation["peg_assessment"]["peg"]
    blended_upside = valuation["blended_upside_pct"]

    score = scoring.compute_stock_score(
        upside_pct=blended_upside,
        peg=peg_value,
        roe_pct=fundamentals.roe_pct,
        return_6m_pct=summary["returns_pct"]["months_6"],
        drawdown_pct=summary["max_drawdown_pct"],
        volatility_pct=summary["annualized_volatility_pct"],
    )

    news = sentiment.aggregate(sentiment.load_news(prices.symbol), last_bar.date)
    anchor = valuation["blended_fair_value_per_share"]
    market_fair_value = (
        fair_value.compute_fair_value(
            price=price, intrinsic_anchor=anchor, indicators=summary, news=news
        )
        if anchor
        else None
    )

    return {
        "news": news,
        "fair_value": market_fair_value,
        "symbol": prices.symbol,
        "name": fundamentals.name,
        "sector": fundamentals.sector,
        "currency": prices.currency,
        "source": prices.source,
        "as_of": last_bar.date.isoformat(),
        "price": {
            "current": price,
            "previous_close": quote.previous_close,
            "change_pct": quote.change_pct,
        },
        "indicators": summary,
        "series": _chart_series(prices),
        "fundamentals": {
            "as_of": fundamentals.as_of.isoformat()
            if fundamentals.as_of
            else None,
            "shares_outstanding": fundamentals.shares_outstanding,
            "eps_ttm": fundamentals.eps_ttm,
            "eps_growth_pct": fundamentals.eps_growth_pct,
            "book_value_per_share": fundamentals.book_value_per_share,
            "dividend_per_share": fundamentals.dividend_per_share,
            "revenue_ttm": fundamentals.revenue_ttm,
            "ebitda_ttm": fundamentals.ebitda_ttm,
            "net_debt": fundamentals.net_debt,
            "free_cash_flow_ttm": fundamentals.free_cash_flow_ttm,
            "roe_pct": fundamentals.roe_pct,
        },
        "valuation": valuation,
        "score": score,
        "disclaimer": DISCLAIMER,
    }


def list_symbols() -> dict:
    provider = get_provider()
    return {
        "provider": provider.name,
        "symbols": provider.list_symbols(),
        "disclaimer": DISCLAIMER,
    }


__all__ = [
    "ProviderError",
    "ValuationInputError",
    "analyze_symbol",
    "build_valuation",
    "list_symbols",
]
