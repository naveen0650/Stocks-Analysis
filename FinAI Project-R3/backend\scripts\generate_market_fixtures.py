"""Generate the recorded-sample market fixtures under
app/market/fixtures/ and app/market/fixtures/news/.

Includes 12 NIFTY 50 benchmark companies across Energy, IT, Banking, FMCG,
Automobile, Telecom, Pharma, Infrastructure, and Consumer Durables.
The data is synthetic (seeded geometric random walk with a seasonal wave),
so the numbers are stable across regenerations and carry no claim about
real companies — file contents are labelled `sample: true`.
"""

from __future__ import annotations

import json
import random
from datetime import date, timedelta
from pathlib import Path

FIXTURE_DIR = Path(__file__).resolve().parent.parent / "app" / "market" / "fixtures"
NEWS_DIR = FIXTURE_DIR / "news"

SERIES_END = date(2026, 9, 30)
TRADING_DAYS = 131  # Apr-Sep weekdays

SYMBOLS = [
    {
        "file": "RELIANCE.NS.json",
        "symbol": "RELIANCE.NS",
        "name": "Reliance Industries Ltd [sample]",
        "sector": "Energy",
        "currency": "INR",
        "seed": 42,
        "start_price": 2850.0,
        "drift": 0.0009,
        "vol": 0.011,
        "wave_amplitude": 0.018,
        "wave_period": 23,
        "base_volume": 8_500_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 1353.0,
            "eps_ttm": 42.0,
            "eps_growth_pct": 6.0,
            "book_value_per_share": 350.0,
            "dividend_per_share": 10.0,
            "revenue_ttm": 992_000.0,
            "ebitda_ttm": 178_000.0,
            "net_debt": 110_000.0,
            "free_cash_flow_ttm": 128_000.0,
            "roe_pct": 8.9,
        },
        "news": [
            {"published": "2026-09-29", "source": "sample-wire", "headline": "Reliance retail arm posts record festive quarter, strong growth in footfalls"},
            {"published": "2026-09-27", "source": "sample-wire", "headline": "Jio platforms wins large enterprise deal, analysts see margin expansion"},
            {"published": "2026-09-26", "source": "sample-wire", "headline": "Brokerage upgraded Reliance to outperform on new energy expansion"},
            {"published": "2026-09-24", "source": "sample-wire", "headline": "Refining margins under pressure amid global slowdown concerns"},
            {"published": "2026-09-23", "source": "sample-wire", "headline": "Reliance announces partnership for green hydrogen launch"},
            {"published": "2026-09-15", "source": "sample-wire", "headline": "O2C segment faces headwinds as crude stays volatile"},
            {"published": "2026-09-08", "source": "sample-wire", "headline": "Reliance AGM: board approves dividend, outlines robust capex plan"},
        ],
    },
    {
        "file": "TCS.NS.json",
        "symbol": "TCS.NS",
        "name": "Tata Consultancy Services Ltd [sample]",
        "sector": "Information Technology",
        "currency": "INR",
        "seed": 7,
        "start_price": 3350.0,
        "drift": 0.0004,
        "vol": 0.009,
        "wave_amplitude": 0.012,
        "wave_period": 31,
        "base_volume": 2_900_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 362.0,
            "eps_ttm": 140.0,
            "eps_growth_pct": 9.0,
            "book_value_per_share": 385.0,
            "dividend_per_share": 62.0,
            "revenue_ttm": 255_000.0,
            "ebitda_ttm": 71_000.0,
            "net_debt": -20_000.0,
            "free_cash_flow_ttm": 48_000.0,
            "roe_pct": 51.0,
        },
        "news": [
            {"published": "2026-09-29", "source": "sample-wire", "headline": "TCS wins multi-year deal from European bank"},
            {"published": "2026-09-25", "source": "sample-wire", "headline": "IT sector faces demand slowdown as US clients delay spending"},
            {"published": "2026-09-22", "source": "sample-wire", "headline": "Brokerage downgraded TCS citing weak deal ramp-ups and pricing pressure"},
            {"published": "2026-09-18", "source": "sample-wire", "headline": "TCS announces buyback, signals strong cash position"},
            {"published": "2026-09-10", "source": "sample-wire", "headline": "Attrition declines for third straight quarter at TCS"},
            {"published": "2026-09-02", "source": "sample-wire", "headline": "Analysts flag margin concerns amid wage hikes"},
        ],
    },
    {
        "file": "HDFCBANK.NS.json",
        "symbol": "HDFCBANK.NS",
        "name": "HDFC Bank Ltd [sample]",
        "sector": "Banking & Financials",
        "currency": "INR",
        "seed": 101,
        "start_price": 1520.0,
        "drift": 0.0005,
        "vol": 0.0085,
        "wave_amplitude": 0.014,
        "wave_period": 27,
        "base_volume": 12_400_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 760.0,
            "eps_ttm": 88.0,
            "eps_growth_pct": 16.5,
            "book_value_per_share": 620.0,
            "dividend_per_share": 19.5,
            "revenue_ttm": 310_000.0,
            "ebitda_ttm": 102_000.0,
            "net_debt": -45_000.0,
            "free_cash_flow_ttm": 74_000.0,
            "roe_pct": 16.8,
        },
        "news": [
            {"published": "2026-09-30", "source": "sample-wire", "headline": "HDFC Bank reports strong deposit growth, beats quarterly profit estimates"},
            {"published": "2026-09-28", "source": "sample-wire", "headline": "Brokerage upgraded HDFC Bank to outperform as merger synergies accelerate"},
            {"published": "2026-09-26", "source": "sample-wire", "headline": "Retail loan book expansion remains robust across tier-2 cities"},
            {"published": "2026-09-24", "source": "sample-wire", "headline": "Analysts bullish on margin expansion in second half of fiscal year"},
            {"published": "2026-09-20", "source": "sample-wire", "headline": "HDFC Bank launches digital SME lending platform"},
        ],
    },
    {
        "file": "INFY.NS.json",
        "symbol": "INFY.NS",
        "name": "Infosys Ltd [sample]",
        "sector": "Information Technology",
        "currency": "INR",
        "seed": 19,
        "start_price": 1480.0,
        "drift": 0.0005,
        "vol": 0.010,
        "wave_amplitude": 0.015,
        "wave_period": 25,
        "base_volume": 6_800_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 415.0,
            "eps_ttm": 82.0,
            "eps_growth_pct": 19.5,
            "book_value_per_share": 235.0,
            "dividend_per_share": 46.0,
            "revenue_ttm": 172_000.0,
            "ebitda_ttm": 46_500.0,
            "net_debt": -22_000.0,
            "free_cash_flow_ttm": 38_000.0,
            "roe_pct": 33.4,
        },
        "news": [
            {"published": "2026-09-29", "source": "sample-wire", "headline": "Infosys raises guidance after record generative AI deal wins"},
            {"published": "2026-09-27", "source": "sample-wire", "headline": "Infosys announces strategic partnership with European cloud provider"},
            {"published": "2026-09-25", "source": "sample-wire", "headline": "Brokerage upgraded Infosys on strong large-deal pipeline"},
            {"published": "2026-09-18", "source": "sample-wire", "headline": "Discretionary IT spending shows signs of rebound in North America"},
            {"published": "2026-09-11", "source": "sample-wire", "headline": "Board approves interim dividend for shareholders"},
        ],
    },
    {
        "file": "ICICIBANK.NS.json",
        "symbol": "ICICIBANK.NS",
        "name": "ICICI Bank Ltd [sample]",
        "sector": "Banking & Financials",
        "currency": "INR",
        "seed": 33,
        "start_price": 1080.0,
        "drift": 0.0006,
        "vol": 0.009,
        "wave_amplitude": 0.013,
        "wave_period": 29,
        "base_volume": 10_200_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 702.0,
            "eps_ttm": 64.0,
            "eps_growth_pct": 18.0,
            "book_value_per_share": 365.0,
            "dividend_per_share": 10.0,
            "revenue_ttm": 186_000.0,
            "ebitda_ttm": 68_000.0,
            "net_debt": -30_000.0,
            "free_cash_flow_ttm": 52_000.0,
            "roe_pct": 18.4,
        },
        "news": [
            {"published": "2026-09-28", "source": "sample-wire", "headline": "ICICI Bank posts strong quarterly profit, asset quality improves"},
            {"published": "2026-09-25", "source": "sample-wire", "headline": "Analysts remain bullish on ICICI Bank retail and digital franchise"},
            {"published": "2026-09-21", "source": "sample-wire", "headline": "Net interest margin stays resilient despite deposit rate pressure"},
            {"published": "2026-09-14", "source": "sample-wire", "headline": "ICICI Bank expands wealth management footprint"},
        ],
    },
    {
        "file": "ITC.NS.json",
        "symbol": "ITC.NS",
        "name": "ITC Ltd [sample]",
        "sector": "FMCG",
        "currency": "INR",
        "seed": 55,
        "start_price": 430.0,
        "drift": 0.0003,
        "vol": 0.0075,
        "wave_amplitude": 0.010,
        "wave_period": 34,
        "base_volume": 14_500_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 1248.0,
            "eps_ttm": 24.5,
            "eps_growth_pct": 18.0,
            "book_value_per_share": 68.0,
            "dividend_per_share": 18.5,
            "revenue_ttm": 82_000.0,
            "ebitda_ttm": 36_500.0,
            "net_debt": -28_000.0,
            "free_cash_flow_ttm": 31_500.0,
            "roe_pct": 31.2,
        },
        "news": [
            {"published": "2026-09-29", "source": "sample-wire", "headline": "ITC FMCG segment records strong growth and margin expansion"},
            {"published": "2026-09-26", "source": "sample-wire", "headline": "Hotel demerger unlocks value, analysts upgrade ITC to outperform"},
            {"published": "2026-09-19", "source": "sample-wire", "headline": "Agri business exports surge on robust global demand"},
            {"published": "2026-09-12", "source": "sample-wire", "headline": "Consistent dividend payout attracts defensive portfolio inflows"},
        ],
    },
    {
        "file": "SBIN.NS.json",
        "symbol": "SBIN.NS",
        "name": "State Bank of India [sample]",
        "sector": "Banking & Financials",
        "currency": "INR",
        "seed": 64,
        "start_price": 760.0,
        "drift": 0.0005,
        "vol": 0.0115,
        "wave_amplitude": 0.016,
        "wave_period": 22,
        "base_volume": 16_000_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 892.0,
            "eps_ttm": 74.0,
            "eps_growth_pct": 15.0,
            "book_value_per_share": 455.0,
            "dividend_per_share": 13.7,
            "revenue_ttm": 445_000.0,
            "ebitda_ttm": 112_000.0,
            "net_debt": -38_000.0,
            "free_cash_flow_ttm": 82_000.0,
            "roe_pct": 17.6,
        },
        "news": [
            {"published": "2026-09-30", "source": "sample-wire", "headline": "SBI posts record annual profit, credit growth beats industry average"},
            {"published": "2026-09-27", "source": "sample-wire", "headline": "YONO digital platform user base surges past milestone"},
            {"published": "2026-09-24", "source": "sample-wire", "headline": "Gross NPA ratio declines to multi-year low on strong recoveries"},
            {"published": "2026-09-17", "source": "sample-wire", "headline": "SBI board approves infrastructure bond issuance for expansion"},
        ],
    },
    {
        "file": "BHARTIARTL.NS.json",
        "symbol": "BHARTIARTL.NS",
        "name": "Bharti Airtel Ltd [sample]",
        "sector": "Telecom",
        "currency": "INR",
        "seed": 77,
        "start_price": 1290.0,
        "drift": 0.0006,
        "vol": 0.0095,
        "wave_amplitude": 0.014,
        "wave_period": 26,
        "base_volume": 5_900_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 570.0,
            "eps_ttm": 58.0,
            "eps_growth_pct": 25.0,
            "book_value_per_share": 215.0,
            "dividend_per_share": 14.0,
            "revenue_ttm": 168_000.0,
            "ebitda_ttm": 88_000.0,
            "net_debt": 95_000.0,
            "free_cash_flow_ttm": 52_000.0,
            "roe_pct": 21.5,
        },
        "news": [
            {"published": "2026-09-29", "source": "sample-wire", "headline": "Bharti Airtel ARPU surges after tariff hike, strong 5G subscriber growth"},
            {"published": "2026-09-26", "source": "sample-wire", "headline": "Free cash flow generation accelerates as capex intensity peaks"},
            {"published": "2026-09-22", "source": "sample-wire", "headline": "Airtel Business wins cloud and cybersecurity order from enterprise clients"},
            {"published": "2026-09-15", "source": "sample-wire", "headline": "Africa operations face currency headwinds despite volume growth"},
        ],
    },
    {
        "file": "LT.NS.json",
        "symbol": "LT.NS",
        "name": "Larsen & Toubro Ltd [sample]",
        "sector": "Infrastructure & Engineering",
        "currency": "INR",
        "seed": 88,
        "start_price": 3420.0,
        "drift": 0.0004,
        "vol": 0.0105,
        "wave_amplitude": 0.015,
        "wave_period": 24,
        "base_volume": 2_400_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 137.5,
            "eps_ttm": 168.0,
            "eps_growth_pct": 21.5,
            "book_value_per_share": 760.0,
            "dividend_per_share": 38.0,
            "revenue_ttm": 255_000.0,
            "ebitda_ttm": 38_000.0,
            "net_debt": 12_000.0,
            "free_cash_flow_ttm": 28_500.0,
            "roe_pct": 18.4,
        },
        "news": [
            {"published": "2026-09-28", "source": "sample-wire", "headline": "L&T wins mega hydrocarbon and renewable energy order in Middle East"},
            {"published": "2026-09-25", "source": "sample-wire", "headline": "Order book crosses record milestone with strong infrastructure demand"},
            {"published": "2026-09-19", "source": "sample-wire", "headline": "Brokerage maintains outperform rating on robust execution visibility"},
            {"published": "2026-09-10", "source": "sample-wire", "headline": "Working capital discipline drives strong cash flow improvement"},
        ],
    },
    {
        "file": "MARUTI.NS.json",
        "symbol": "MARUTI.NS",
        "name": "Maruti Suzuki India Ltd [sample]",
        "sector": "Automobile",
        "currency": "INR",
        "seed": 91,
        "start_price": 11800.0,
        "drift": 0.0004,
        "vol": 0.0095,
        "wave_amplitude": 0.014,
        "wave_period": 28,
        "base_volume": 620_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 31.4,
            "eps_ttm": 465.0,
            "eps_growth_pct": 14.0,
            "book_value_per_share": 2780.0,
            "dividend_per_share": 125.0,
            "revenue_ttm": 148_000.0,
            "ebitda_ttm": 21_500.0,
            "net_debt": -6_500.0,
            "free_cash_flow_ttm": 15_200.0,
            "roe_pct": 16.9,
        },
        "news": [
            {"published": "2026-09-29", "source": "sample-wire", "headline": "Maruti Suzuki SUV market share expands ahead of festive season launch"},
            {"published": "2026-09-26", "source": "sample-wire", "headline": "Export volumes hit record high across Latin America and Africa"},
            {"published": "2026-09-21", "source": "sample-wire", "headline": "Entry-level small car demand remains weak amid rural slowdown"},
            {"published": "2026-09-14", "source": "sample-wire", "headline": "Softening commodity prices support operating margin expansion"},
        ],
    },
    {
        "file": "SUNPHARMA.NS.json",
        "symbol": "SUNPHARMA.NS",
        "name": "Sun Pharmaceutical Industries Ltd [sample]",
        "sector": "Pharmaceuticals",
        "currency": "INR",
        "seed": 112,
        "start_price": 1560.0,
        "drift": 0.0006,
        "vol": 0.0088,
        "wave_amplitude": 0.011,
        "wave_period": 30,
        "base_volume": 3_100_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 240.0,
            "eps_ttm": 52.0,
            "eps_growth_pct": 15.5,
            "book_value_per_share": 285.0,
            "dividend_per_share": 13.5,
            "revenue_ttm": 52_000.0,
            "ebitda_ttm": 15_400.0,
            "net_debt": -11_000.0,
            "free_cash_flow_ttm": 11_800.0,
            "roe_pct": 17.8,
        },
        "news": [
            {"published": "2026-09-30", "source": "sample-wire", "headline": "Sun Pharma specialty portfolio posts strong US sales growth"},
            {"published": "2026-09-27", "source": "sample-wire", "headline": "Regulatory approval received for new dermatology formulation"},
            {"published": "2026-09-23", "source": "sample-wire", "headline": "Domestic formulation business beats market growth for sixth quarter"},
            {"published": "2026-09-16", "source": "sample-wire", "headline": "US generics pricing pressure moderates, supporting margins"},
        ],
    },
    {
        "file": "TITAN.NS.json",
        "symbol": "TITAN.NS",
        "name": "Titan Company Ltd [sample]",
        "sector": "Consumer Durables",
        "currency": "INR",
        "seed": 125,
        "start_price": 3480.0,
        "drift": 0.0007,
        "vol": 0.0108,
        "wave_amplitude": 0.017,
        "wave_period": 21,
        "base_volume": 1_450_000,
        "fundamentals": {
            "as_of": "2026-03-31",
            "shares_outstanding": 88.8,
            "eps_ttm": 46.0,
            "eps_growth_pct": 16.0,
            "book_value_per_share": 165.0,
            "dividend_per_share": 11.0,
            "revenue_ttm": 54_000.0,
            "ebitda_ttm": 6_400.0,
            "net_debt": 2_200.0,
            "free_cash_flow_ttm": 4_100.0,
            "roe_pct": 31.5,
        },
        "news": [
            {"published": "2026-09-28", "source": "sample-wire", "headline": "Volatile gold prices pressure jewellery margins and near-term demand"},
            {"published": "2026-09-25", "source": "sample-wire", "headline": "Brokerage downgraded Titan citing rich valuation and margin concerns"},
            {"published": "2026-09-20", "source": "sample-wire", "headline": "Watches and wearables division posts strong festive store expansion"},
            {"published": "2026-09-12", "source": "sample-wire", "headline": "Rising competition in lab-grown diamonds creates sector headwinds"},
        ],
    },
]


def _trading_days(count: int, end: date) -> list[date]:
    days: list[date] = []
    cursor = end
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    return list(reversed(days))


def build_bars(spec: dict) -> list[dict]:
    rng = random.Random(spec["seed"])
    days = _trading_days(TRADING_DAYS, SERIES_END)
    bars: list[dict] = []
    price = spec["start_price"]
    for i, day in enumerate(days):
        wave = spec["wave_amplitude"] * ((i % spec["wave_period"]) / spec["wave_period"] * 6.283)
        daily_return = spec["drift"] - (wave - spec["wave_amplitude"] * 3.0) * 0.001 + rng.gauss(0.0, spec["vol"])
        close = max(1.0, price * (1.0 + daily_return))
        open_ = price * (1.0 + rng.gauss(0.0, spec["vol"] / 3))
        high = max(open_, close) * (1.0 + abs(rng.gauss(0.0, spec["vol"] / 2)))
        low = min(open_, close) * (1.0 - abs(rng.gauss(0.0, spec["vol"] / 2)))
        volume = int(spec["base_volume"] * (1.0 + rng.gauss(0.0, 0.18)))
        bars.append(
            {
                "date": day.isoformat(),
                "open": round(open_, 2),
                "high": round(high, 2),
                "low": round(low, 2),
                "close": round(close, 2),
                "volume": volume,
            }
        )
        price = close
    return bars


def build_dataset(spec: dict) -> dict:
    bars = build_bars(spec)
    return {
        "sample": True,
        "note": "Synthetic recorded-sample data for development, tests and "
        "the dissertation demo. Not real market data.",
        "symbol": spec["symbol"],
        "name": spec["name"],
        "sector": spec["sector"],
        "currency": spec["currency"],
        "quote": {
            "price": bars[-1]["close"],
            "previous_close": bars[-2]["close"],
            "as_of": bars[-1]["date"],
        },
        "fundamentals": spec["fundamentals"],
        "bars": bars,
    }


def build_news(spec: dict) -> dict:
    return {
        "sample": True,
        "note": "Illustrative recorded-sample headlines for demo/testing only - not real news. A live news provider replaces this file behind the same contract.",
        "symbol": spec["symbol"],
        "articles": spec["news"],
    }


def main() -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    NEWS_DIR.mkdir(parents=True, exist_ok=True)
    for spec in SYMBOLS:
        path = FIXTURE_DIR / spec["file"]
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(build_dataset(spec), fh, indent=1)
        news_path = NEWS_DIR / spec["file"]
        with open(news_path, "w", encoding="utf-8") as fh:
            json.dump(build_news(spec), fh, indent=1)
        print(f"wrote {spec['symbol']} ({path.name} + news)")


if __name__ == "__main__":
    main()
