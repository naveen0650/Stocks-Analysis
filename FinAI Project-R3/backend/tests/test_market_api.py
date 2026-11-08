"""Integration tests for the /api/v1/market endpoints."""

import pytest


def test_market_requires_authentication(client):
    assert client.get("/api/v1/market/symbols").status_code == 401
    assert client.get("/api/v1/market/TCS.NS/analysis").status_code == 401


def test_symbols_listing(client, user_headers):
    headers, _ = user_headers
    resp = client.get("/api/v1/market/symbols", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["provider"] == "recorded-sample"
    listed = {s["symbol"] for s in body["symbols"]}
    assert {"RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"} <= listed
    assert len(listed) >= 10
    assert "disclaimer" in body


def test_analysis_payload_shape_and_consistency(client, user_headers):
    headers, _ = user_headers
    resp = client.get("/api/v1/market/TCS.NS/analysis", headers=headers)
    assert resp.status_code == 200
    body = resp.json()

    assert body["symbol"] == "TCS.NS"
    assert body["source"] == "recorded-sample"
    assert body["as_of"] == "2026-09-30"
    assert body["price"]["current"] == pytest.approx(3728.0)

    # indicators: 131 bars -> SMA20/SMA50/RSI all warmed up
    ind = body["indicators"]
    assert ind["sma_20"] and ind["sma_50"] and ind["rsi_14"]
    assert 0 <= ind["rsi_14"] <= 100
    assert ind["max_drawdown_pct"] <= 0
    assert ind["annualized_volatility_pct"] > 0

    series = body["series"]
    assert len(series["dates"]) == 131
    assert len(series["close"]) == 131
    assert series["sma_50"][49] is not None
    assert series["sma_50"][48] is None  # warm-up boundary

    methods = {m["method"] for m in body["valuation"]["methods"]}
    assert {"dcf", "pe", "ev_ebitda", "ddm", "peg_implied"} <= methods
    blended = body["valuation"]["blended_fair_value_per_share"]
    manual = sum(m["fair_value_per_share"] for m in body["valuation"]["methods"]) / len(
        body["valuation"]["methods"]
    )
    assert blended == pytest.approx(manual, abs=0.01)

    # every method's upside must agree with price vs fair value
    price = body["price"]["current"]
    for m in body["valuation"]["methods"]:
        expected = round((m["fair_value_per_share"] / price - 1) * 100, 2)
        assert m["upside_pct"] == pytest.approx(expected, abs=0.01)

    score = body["score"]
    assert 0 <= score["score"] <= 100
    assert score["grade"]
    assert score["evaluated_count"] == 6
    assert "not investment advice" in score["disclaimer"]


def test_analysis_unknown_symbol_is_404(client, user_headers):
    headers, _ = user_headers
    resp = client.get("/api/v1/market/NOPE.NS/analysis", headers=headers)
    assert resp.status_code == 404


def test_valuation_recompute_with_custom_assumptions(client, user_headers):
    headers, _ = user_headers
    default = client.post(
        "/api/v1/market/TCS.NS/valuation", headers=headers
    ).json()
    custom = client.post(
        "/api/v1/market/TCS.NS/valuation",
        headers=headers,
        json={
            "stage1_growth_pct": 25.0,
            "terminal_growth_pct": 5.0,
            "wacc_pct": 9.0,
            "pe_target": 30.0,
        },
    ).json()

    assert default["dcf"]["assumptions"]["stage1_growth_pct"] == 14.0
    assert custom["dcf"]["assumptions"]["stage1_growth_pct"] == 25.0
    assert (
        custom["dcf"]["fair_value_per_share"]
        > default["dcf"]["fair_value_per_share"]
    )
    custom_pe = next(m for m in custom["methods"] if m["method"] == "pe")
    default_pe = next(m for m in default["methods"] if m["method"] == "pe")
    assert custom_pe["fair_value_per_share"] > default_pe["fair_value_per_share"]


def test_valuation_rejects_growth_above_wacc(client, user_headers):
    headers, _ = user_headers
    resp = client.post(
        "/api/v1/market/TCS.NS/valuation",
        headers=headers,
        json={"terminal_growth_pct": 12.0, "wacc_pct": 10.0},
    )
    assert resp.status_code == 422


def test_valuation_unknown_symbol_is_404(client, user_headers):
    headers, _ = user_headers
    resp = client.post("/api/v1/market/NOPE.NS/valuation", headers=headers)
    assert resp.status_code == 404
