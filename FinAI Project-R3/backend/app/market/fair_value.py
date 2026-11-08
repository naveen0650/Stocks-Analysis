"""Market-adjusted Fair Value engine (R3).

    fair_value = intrinsic_anchor x (1 + technical_adj) x (1 + sentiment_adj)

* intrinsic_anchor  - blended fundamental value (DCF, P/E, EV/EBITDA, DDM)
                      already computed by the valuation engine.
* technical_adj     - bounded +/-8 %. Confluence of trend (price vs SMA20/50),
                      momentum (RSI, MACD histogram) and Bollinger position.
* sentiment_adj     - bounded +/-6 %. Recency-weighted news sentiment scaled by
                      buzz level (high buzz amplifies, normal dampens).

Fundamentals stay the anchor (they explain >=86 % of the number); market
conditions only tilt it. A fair-value *corridor* (low/high) widens with
volatility. Every component is returned so the result is fully explainable.
"""

from __future__ import annotations

MAX_TECH_ADJ = 0.08
MAX_SENT_ADJ = 0.06
BUZZ_MULT = {"high": 1.0, "elevated": 0.8, "normal": 0.6, "none": 0.0}


def _clip(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def technical_signal(ind: dict, price: float) -> dict:
    """Return a confluence score in [-1, 1] with per-signal breakdown."""
    signals = []

    def add(name, value, reading):
        signals.append({"signal": name, "value": round(value, 3), "reading": reading})

    sma20, sma50 = ind.get("sma_20"), ind.get("sma_50")
    if sma20 and sma50:
        trend = _clip(((price / sma50) - 1.0) * 10)  # +10 % above SMA50 -> +1
        cross = 0.3 if sma20 > sma50 else -0.3
        v = _clip(trend * 0.7 + cross)
        add("trend", v, "uptrend" if v > 0.1 else "downtrend" if v < -0.1 else "sideways")
    rsi = ind.get("rsi_14")
    if rsi is not None:
        # 50 neutral; >70 overbought (mean-reversion risk), <30 oversold
        if rsi > 70:
            v = -((rsi - 70) / 30)
        elif rsi < 30:
            v = (30 - rsi) / 30
        else:
            v = (rsi - 50) / 40
        add("rsi_momentum", _clip(v), "overbought" if rsi > 70 else "oversold" if rsi < 30 else "neutral")
    hist = (ind.get("macd") or {}).get("histogram")
    if hist is not None and price:
        v = _clip(hist / price * 200)
        add("macd", v, "bullish" if hist > 0 else "bearish")
    bb = ind.get("bollinger") or {}
    if bb.get("upper") and bb.get("lower") and bb["upper"] != bb["lower"]:
        pos = (price - bb["lower"]) / (bb["upper"] - bb["lower"])  # 0..1
        v = _clip((0.5 - pos) * 1.2)  # near lower band = room to rise
        add("bollinger_position", v, f"{pos * 100:.0f}% of band")
    if not signals:
        return {"score": 0.0, "signals": [], "status": "not_evaluated"}
    score = sum(s["value"] for s in signals) / len(signals)
    return {"score": round(score, 4), "signals": signals, "status": "evaluated"}


def compute_fair_value(
    *,
    price: float,
    intrinsic_anchor: float,
    indicators: dict,
    news: dict,
) -> dict:
    tech = technical_signal(indicators, price)
    tech_adj = tech["score"] * MAX_TECH_ADJ

    if news.get("status") == "evaluated":
        sent_adj = news["sentiment_score"] * MAX_SENT_ADJ * BUZZ_MULT.get(news["buzz_level"], 0.6)
    else:
        sent_adj = 0.0

    fair = intrinsic_anchor * (1 + tech_adj) * (1 + sent_adj)
    vol = (indicators.get("annualized_volatility_pct") or 25.0) / 100.0
    band = min(max(vol * 0.5, 0.05), 0.25)  # corridor half-width 5-25 %
    low, high = fair * (1 - band), fair * (1 + band)
    upside = (fair / price - 1.0) * 100.0

    if price < low:
        verdict = "Undervalued"
    elif price > high:
        verdict = "Overvalued"
    elif upside >= 5:
        verdict = "Fairly valued - mild upside"
    elif upside <= -5:
        verdict = "Fairly valued - mild downside"
    else:
        verdict = "Fairly valued"

    return {
        "current_price": round(price, 2),
        "fair_value": round(fair, 2),
        "corridor": {"low": round(low, 2), "high": round(high, 2), "half_width_pct": round(band * 100, 1)},
        "upside_pct": round(upside, 2),
        "verdict": verdict,
        "components": {
            "intrinsic_anchor": round(intrinsic_anchor, 2),
            "technical_adjustment_pct": round(tech_adj * 100, 2),
            "sentiment_adjustment_pct": round(sent_adj * 100, 2),
        },
        "technical": tech,
        "method": (
            "fair = intrinsic x (1 + technical_adj[+/-8%]) x (1 + sentiment_adj[+/-6%]); "
            "corridor width = 0.5 x annualised volatility (5-25%)"
        ),
    }
