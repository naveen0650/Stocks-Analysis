"""Golden tests for the valuation engines.

The DCF case below is fully hand-computed: 100 base FCF, +5% for 2 years,
2% terminal growth, 10% WACC, 50 net debt, 10 shares -> fair value
129.8295 per share.
"""

import pytest

from app.market.valuation import (
    DcfAssumptions,
    SCENARIO_PRESETS,
    dcf_sensitivity,
    dcf_valuation,
    ev_ebitda_fair_value,
    gordon_growth_model,
    pe_fair_value,
    peg_assessment,
    scenario_valuations,
)

GOLDEN_ASSUMPTIONS = DcfAssumptions(
    projection_years=2, stage1_growth_pct=5.0, terminal_growth_pct=2.0, wacc_pct=10.0
)


def test_dcf_full_working_matches_hand_computation():
    result = dcf_valuation(100.0, 50.0, 10.0, GOLDEN_ASSUMPTIONS)

    flows = result["projected_cash_flows"]
    assert flows[0]["free_cash_flow"] == pytest.approx(105.0)
    assert flows[0]["present_value"] == pytest.approx(105.0 / 1.1, abs=1e-3)
    assert flows[1]["free_cash_flow"] == pytest.approx(110.25)
    assert flows[1]["present_value"] == pytest.approx(110.25 / 1.21, abs=1e-3)

    assert result["pv_of_forecast_flows"] == pytest.approx(186.5702, abs=1e-3)
    # TV = 110.25 * 1.02 / (0.10 - 0.02) = 1405.6875
    assert result["terminal_value"] == pytest.approx(1405.6875, abs=1e-4)
    assert result["pv_of_terminal_value"] == pytest.approx(
        1405.6875 / 1.21, abs=1e-3
    )
    assert result["enterprise_value"] == pytest.approx(1348.2955, abs=1e-3)
    assert result["equity_value"] == pytest.approx(1298.2955, abs=1e-3)
    assert result["fair_value_per_share"] == pytest.approx(129.8295, abs=1e-3)
    assert result["terminal_value_share_pct"] == pytest.approx(86.2, abs=0.1)


def test_dcf_rejects_inconsistent_assumptions():
    with pytest.raises(ValueError):
        dcf_valuation(0.0, 50.0, 10.0, GOLDEN_ASSUMPTIONS)  # no FCF
    with pytest.raises(ValueError):
        dcf_valuation(100.0, 50.0, 0.0, GOLDEN_ASSUMPTIONS)  # no shares
    bad_growth = DcfAssumptions(
        projection_years=2,
        stage1_growth_pct=5.0,
        terminal_growth_pct=10.0,  # >= WACC
        wacc_pct=10.0,
    )
    with pytest.raises(ValueError):
        dcf_valuation(100.0, 50.0, 10.0, bad_growth)


def test_dcf_sensitivity_grid_is_monotonic():
    grid = dcf_sensitivity(
        100.0,
        50.0,
        10.0,
        wacc_values=[9.0, 11.0, 13.0],
        terminal_growth_values=[1.0, 3.0, 5.0],
        base=GOLDEN_ASSUMPTIONS,
    )
    assert len(grid["fair_values"]) == 3
    assert all(len(row) == 3 for row in grid["fair_values"])
    for row in grid["fair_values"]:  # higher terminal growth -> higher value
        assert row == sorted(row)
    by_wacc = grid["fair_values"]  # rows are ascending WACC
    first_col = [row[0] for row in by_wacc]
    assert first_col == sorted(first_col, reverse=True)  # higher WACC -> lower


def test_gordon_growth_model_edges():
    assert gordon_growth_model(5.0, 10.0, 4.0) == pytest.approx(86.6667, abs=1e-3)
    assert gordon_growth_model(5.0, 4.0, 4.0) is None  # r == g undefined
    assert gordon_growth_model(5.0, 3.0, 4.0) is None  # r < g undefined
    assert gordon_growth_model(0.0, 10.0, 4.0) is None  # no dividend


def test_pe_and_ev_ebitda():
    assert pe_fair_value(10.0, 15.0) == 150.0
    with pytest.raises(ValueError):
        pe_fair_value(-1.0, 15.0)
    assert ev_ebitda_fair_value(200.0, 8.0, 200.0, 10.0) == 140.0


def test_peg_assessment_verdicts():
    cheap = peg_assessment(pe_ttm=20.0, eps_growth_pct=25.0)
    assert cheap["peg"] == pytest.approx(0.8)
    assert cheap["verdict"] == "undervalued_on_growth"
    rich = peg_assessment(pe_ttm=40.0, eps_growth_pct=10.0)
    assert rich["verdict"] == "overvalued_on_growth"
    fair = peg_assessment(pe_ttm=10.0, eps_growth_pct=10.0)
    assert fair["verdict"] == "fairly_priced_on_growth"
    with pytest.raises(ValueError):
        peg_assessment(pe_ttm=20.0, eps_growth_pct=0.0)


def test_scenarios_are_monotonic_bear_base_bull():
    fundamentals = {
        "free_cash_flow_ttm": 100.0,
        "net_debt": 0.0,
        "shares_outstanding": 10.0,
        "eps_ttm": 10.0,
        "ebitda_ttm": 50.0,
        "dividend_per_share": 5.0,
    }
    scenarios = scenario_valuations(
        fundamentals=fundamentals,
        price=100.0,
        base=GOLDEN_ASSUMPTIONS,
        pe_target=10.0,
        ev_ebitda_target=10.0,
        ddm_growth_pct=2.0,
        required_return_pct=10.0,
    )
    by_name = {s["scenario"]: s for s in scenarios}
    assert set(by_name) == set(SCENARIO_PRESETS)
    values = [by_name[k]["blended"]["value"] for k in ("bear", "base", "bull")]
    assert values == sorted(values)
    # base scenario uses the assumptions unchanged -> matches a direct run
    direct = dcf_valuation(100.0, 0.0, 10.0, GOLDEN_ASSUMPTIONS)
    assert by_name["base"]["fair_values"]["dcf"]["value"] == pytest.approx(
        direct["fair_value_per_share"], abs=1e-3
    )
