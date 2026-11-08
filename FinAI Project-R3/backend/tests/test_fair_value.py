"""R3: news sentiment + market-adjusted fair value."""

from datetime import date

from app.market import fair_value, sentiment


def test_score_text_positive_negative_and_negation():
    assert sentiment.score_text("Company beats estimates, record profit")["label"] == "positive"
    assert sentiment.score_text("Shares plunge after downgrade")["label"] == "negative"
    assert sentiment.score_text("Board meets on Tuesday")["label"] == "neutral"
    # negation flips polarity
    assert sentiment.score_text("not weak")["score"] > 0


def test_score_is_bounded_and_reports_evidence():
    s = sentiment.score_text("surge surge surge record beats upgrade rally")
    assert -1 < s["score"] < 1
    assert "surge" in s["matched"]


def test_aggregate_recency_weighting():
    as_of = date(2026, 9, 30)
    arts = [
        {"published": "2026-09-30", "headline": "record profit beats"},
        {"published": "2026-07-01", "headline": "plunge loss downgrade"},
    ]
    agg = sentiment.aggregate(arts, as_of)
    assert agg["sentiment_score"] > 0  # recent positive dominates old negative
    assert agg["article_count"] == 2


def test_aggregate_without_news_is_not_evaluated():
    agg = sentiment.aggregate([], date(2026, 9, 30))
    assert agg["status"] == "not_evaluated"


def test_fair_value_adjustments_are_bounded():
    ind = {
        "sma_20": 120, "sma_50": 100, "rsi_14": 60,
        "macd": {"histogram": 5}, "bollinger": {"upper": 130, "lower": 90},
        "annualized_volatility_pct": 30,
    }
    news = {"status": "evaluated", "sentiment_score": 1.0, "buzz_level": "high"}
    fv = fair_value.compute_fair_value(price=110, intrinsic_anchor=100, indicators=ind, news=news)
    c = fv["components"]
    assert abs(c["technical_adjustment_pct"]) <= 8
    assert abs(c["sentiment_adjustment_pct"]) <= 6
    assert fv["corridor"]["low"] < fv["fair_value"] < fv["corridor"]["high"]


def test_fair_value_verdicts():
    news = {"status": "not_evaluated"}
    cheap = fair_value.compute_fair_value(price=50, intrinsic_anchor=100, indicators={}, news=news)
    rich = fair_value.compute_fair_value(price=200, intrinsic_anchor=100, indicators={}, news=news)
    assert cheap["verdict"] == "Undervalued"
    assert rich["verdict"] == "Overvalued"


def test_fair_value_endpoint(client, user_headers):
    headers, _ = user_headers
    r = client.get("/api/v1/market/RELIANCE.NS/fair-value", headers=headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["fair_value"]["fair_value"] > 0
    assert body["news"]["status"] == "evaluated"
    assert "disclaimer" in body


def test_fair_value_unknown_symbol(client, user_headers):
    headers, _ = user_headers
    assert client.get("/api/v1/market/NOPE.NS/fair-value", headers=headers).status_code == 404
