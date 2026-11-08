"""Golden tests for the calculator engines.

FD values verified against the closed-form compound-interest formula; the
mutual-fund engine's XIRR must reproduce its input rate exactly (the
simulation and the solver share the same monthly convention).
"""

import pytest

from app.calculators.fd import FdInput, fd_maturity
from app.calculators.mutual_fund import MfInput, mutual_fund_projection


# ------------------------------------------------------------------ FD


def test_fd_quarterly_matches_closed_form():
    result = fd_maturity(
        FdInput(principal=100_000.0, annual_rate_pct=6.5, years=5, months=0)
    )
    expected = 100_000 * (1 + 0.065 / 4) ** 20
    assert result["maturity_value"] == pytest.approx(expected, abs=0.01)
    assert result["total_interest"] == pytest.approx(expected - 100_000, abs=0.01)
    # effective yield annualises intra-year compounding: (1 + r/4)^4 - 1
    assert result["effective_annual_yield_pct"] == pytest.approx(
        ((1 + 0.065 / 4) ** 4 - 1) * 100, abs=1e-4
    )
    # schedule compounds to the same maturity and starts at the principal
    assert result["schedule"][0]["closing"] == pytest.approx(
        100_000 * (1 + 0.065 / 4) ** 4, abs=0.01
    )
    assert result["schedule"][-1]["closing"] == pytest.approx(expected, abs=0.01)


def test_fd_monthly_compounding_beats_yearly():
    kwargs = dict(principal=100_000.0, annual_rate_pct=7.0, years=3, months=0)
    yearly = fd_maturity(FdInput(compounding="yearly", **kwargs))
    monthly = fd_maturity(FdInput(compounding="monthly", **kwargs))
    assert monthly["maturity_value"] > yearly["maturity_value"]
    assert yearly["maturity_value"] == pytest.approx(100_000 * 1.07**3, abs=0.01)


def test_fd_partial_year_and_senior_bonus():
    base = fd_maturity(
        FdInput(principal=100_000.0, annual_rate_pct=6.5, years=5, months=6)
    )
    senior = fd_maturity(
        FdInput(
            principal=100_000.0,
            annual_rate_pct=6.5,
            years=5,
            months=6,
            senior_citizen_bonus_pct=0.5,
        )
    )
    assert senior["maturity_value"] > base["maturity_value"]
    assert len(base["schedule"]) == 6  # 5 full years + one 6-month row
    assert base["schedule"][-1]["partial_year_months"] == 6
    assert senior["inputs"]["effective_rate_pct"] == 7.0


def test_fd_tax_and_inflation_views():
    result = fd_maturity(
        FdInput(
            principal=100_000.0,
            annual_rate_pct=6.5,
            years=5,
            months=6,
            tax_slab_pct=30.0,
            inflation_pct=5.0,
        )
    )
    tax = result["tax"]
    assert tax["tax_on_interest"] == pytest.approx(
        result["total_interest"] * 0.30, abs=0.01
    )
    assert tax["post_tax_maturity"] == pytest.approx(
        result["principal"] + result["total_interest"] - tax["tax_on_interest"],
        abs=0.01,
    )
    real = result["inflation_adjusted"]
    assert real["real_maturity_value"] < result["maturity_value"]


def test_fd_rejects_bad_inputs():
    with pytest.raises(ValueError):
        fd_maturity(FdInput(principal=0, annual_rate_pct=6.5, years=1, months=0))
    with pytest.raises(ValueError):
        fd_maturity(FdInput(principal=1000, annual_rate_pct=0, years=1, months=0))
    with pytest.raises(ValueError):
        fd_maturity(FdInput(principal=1000, annual_rate_pct=6.5, years=0, months=0))
    with pytest.raises(ValueError):
        fd_maturity(
            FdInput(principal=1000, annual_rate_pct=6.5, years=1, months=0, compounding="weekly")
        )


# --------------------------------------------------------- Mutual fund


def test_sip_xirr_reproduces_expected_return():
    result = mutual_fund_projection(
        MfInput(expected_return_pct=12.0, years=10, monthly_sip=10_000.0)
    )
    assert result["invested"] == pytest.approx(1_200_000.0)
    assert result["annualised_return_pct"] == pytest.approx(12.0, abs=1e-4)
    assert len(result["schedule"]) == 10
    assert result["schedule"][-1]["year"] == 10


def test_lumpsum_cagr_matches_closed_form():
    result = mutual_fund_projection(
        MfInput(expected_return_pct=12.0, years=10, initial_lumpsum=100_000.0)
    )
    assert result["final_value"] == pytest.approx(100_000 * 1.12**10, abs=0.01)
    assert result["annualised_return_pct"] == pytest.approx(12.0, abs=1e-4)


def test_step_up_increases_invested_and_value():
    flat = mutual_fund_projection(
        MfInput(expected_return_pct=10.0, years=3, monthly_sip=1_000.0)
    )
    stepped = mutual_fund_projection(
        MfInput(expected_return_pct=10.0, years=3, monthly_sip=1_000.0, step_up_pct=10.0)
    )
    # 12 months at 1000, then 1100, then 1210 = 39,720
    assert stepped["invested"] == pytest.approx(39_720.0)
    assert stepped["final_value"] > flat["final_value"]
    # XIRR is money-weighted: the step-up does not change the annualised rate
    assert stepped["annualised_return_pct"] == pytest.approx(
        flat["annualised_return_pct"], abs=1e-3
    )


def test_expense_ratio_shows_drag_and_xirr_nets():
    clean = mutual_fund_projection(
        MfInput(expected_return_pct=12.0, years=10, monthly_sip=10_000.0)
    )
    with_ter = mutual_fund_projection(
        MfInput(expected_return_pct=12.0, years=10, monthly_sip=10_000.0, expense_ratio_pct=1.0)
    )
    assert with_ter["final_value"] < clean["final_value"]
    assert with_ter["expense_drag"] == pytest.approx(
        clean["final_value"] - with_ter["final_value"], abs=0.01
    )
    assert with_ter["annualised_return_pct"] == pytest.approx(11.0, abs=1e-4)


def test_goal_seek_inverts_the_projection():
    base = mutual_fund_projection(
        MfInput(expected_return_pct=12.0, years=10, monthly_sip=10_000.0)
    )
    goal = mutual_fund_projection(
        MfInput(
            expected_return_pct=12.0,
            years=10,
            monthly_sip=10_000.0,
            target_corpus=base["final_value"],
        )
    )
    assert goal["goal_seek"]["required_monthly_sip"] == pytest.approx(10_000.0, abs=1.0)


def test_mf_rejects_bad_inputs():
    with pytest.raises(ValueError):  # nothing invested
        mutual_fund_projection(MfInput(expected_return_pct=12.0, years=5))
    with pytest.raises(ValueError):  # negative sip
        mutual_fund_projection(
            MfInput(expected_return_pct=12.0, years=5, monthly_sip=-100)
        )
    with pytest.raises(ValueError):  # tenure bounds
        mutual_fund_projection(MfInput(expected_return_pct=12.0, years=0, monthly_sip=100))
    with pytest.raises(ValueError):  # target corpus must be positive
        mutual_fund_projection(
            MfInput(expected_return_pct=12.0, years=5, monthly_sip=100, target_corpus=0)
        )


# ------------------------------------------------- API (integration)


def test_calculators_require_authentication(client):
    assert client.post("/api/v1/calculators/fd", json={}).status_code == 401
    assert client.post("/api/v1/calculators/mutual-fund", json={}).status_code == 401


def test_fd_endpoint_math_and_validation(client, user_headers):
    headers, _ = user_headers
    resp = client.post(
        "/api/v1/calculators/fd",
        headers=headers,
        json={"principal": 100000, "annual_rate_pct": 6.5, "years": 5},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["maturity_value"] == pytest.approx(138041.98, abs=0.01)
    assert "not investment advice" in body["disclaimer"]

    bad = client.post(
        "/api/v1/calculators/fd",
        headers=headers,
        json={"principal": 100000, "annual_rate_pct": 6.5, "years": 5, "compounding": "weekly"},
    )
    assert bad.status_code == 422


def test_mutual_fund_endpoint(client, user_headers):
    headers, _ = user_headers
    resp = client.post(
        "/api/v1/calculators/mutual-fund",
        headers=headers,
        json={
            "expected_return_pct": 12,
            "years": 10,
            "monthly_sip": 10000,
            "step_up_pct": 10,
            "expense_ratio_pct": 1,
            "inflation_pct": 6,
            "target_corpus": 5000000,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["invested"] > 0
    assert body["annualised_return_pct"] == pytest.approx(11.0, abs=1e-4)
    assert body["inflation_adjusted"]["real_final_value"] < body["final_value"]
    assert body["goal_seek"]["required_monthly_sip"] > 0

    bad = client.post(
        "/api/v1/calculators/mutual-fund",
        headers=headers,
        json={"expected_return_pct": 12, "years": 10},
    )
    assert bad.status_code == 422  # nothing invested
