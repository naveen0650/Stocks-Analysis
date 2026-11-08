"""Intrinsic-value estimation engines.

Every method is a pure function that returns its full working — inputs,
intermediate steps and the fair value — so the API can show *why* a number
came out the way it did (same explainability contract as the health score).
Units are the caller's choice and stay consistent across a call; the
services layer passes equity values in currency crores and per-share values
in currency.

Conventions:
- rates are percentages (12.0 == 12%)
- cash flows are discounted at (1 + wacc)^t with end-of-year timing
- the terminal value uses Gordon growth off the final projected cash flow
"""

from __future__ import annotations

from dataclasses import dataclass, replace


class ValuationInputError(ValueError):
    """Raised when assumptions are internally inconsistent (e.g. terminal
    growth >= WACC). Routes translate this into a 422."""


@dataclass(frozen=True)
class DcfAssumptions:
    projection_years: int = 5
    stage1_growth_pct: float = 12.0
    terminal_growth_pct: float = 4.0
    wacc_pct: float = 11.0


def dcf_valuation(
    free_cash_flow: float,
    net_debt: float,
    shares_outstanding: float,
    assumptions: DcfAssumptions,
) -> dict:
    """Two-stage DCF: `stage1_growth_pct` for years 1..N, then Gordon-growth
    terminal value. `net_debt` bridges enterprise value to equity value."""
    if free_cash_flow <= 0:
        raise ValuationInputError("Base free cash flow must be positive.")
    if shares_outstanding <= 0:
        raise ValuationInputError("Shares outstanding must be positive.")
    if assumptions.projection_years < 1:
        raise ValuationInputError("projection_years must be >= 1.")
    w = assumptions.wacc_pct / 100.0
    g_t = assumptions.terminal_growth_pct / 100.0
    if not -0.05 < g_t < w:
        raise ValuationInputError(
            "Terminal growth must be below WACC (and above -5%)."
        )
    g1 = assumptions.stage1_growth_pct / 100.0

    flows: list[dict] = []
    pv_forecast = 0.0
    fcf = free_cash_flow
    for year in range(1, assumptions.projection_years + 1):
        fcf = fcf * (1.0 + g1)
        discount = (1.0 + w) ** year
        pv = fcf / discount
        pv_forecast += pv
        flows.append(
            {
                "year": year,
                "free_cash_flow": round(fcf, 4),
                "discount_factor": round(discount, 6),
                "present_value": round(pv, 4),
            }
        )

    final_fcf = fcf  # unrounded; rounding is display-only in `flows`
    terminal_value = final_fcf * (1.0 + g_t) / (w - g_t)
    pv_terminal = terminal_value / (1.0 + w) ** assumptions.projection_years
    enterprise_value = pv_forecast + pv_terminal
    equity_value = enterprise_value - net_debt
    fair_per_share = equity_value / shares_outstanding

    return {
        "assumptions": {
            "projection_years": assumptions.projection_years,
            "stage1_growth_pct": assumptions.stage1_growth_pct,
            "terminal_growth_pct": assumptions.terminal_growth_pct,
            "wacc_pct": assumptions.wacc_pct,
        },
        "base_free_cash_flow": free_cash_flow,
        "projected_cash_flows": flows,
        "pv_of_forecast_flows": round(pv_forecast, 4),
        "terminal_value": round(terminal_value, 4),
        "pv_of_terminal_value": round(pv_terminal, 4),
        "terminal_value_share_pct": round(
            pv_terminal / enterprise_value * 100.0, 1
        ),
        "enterprise_value": round(enterprise_value, 4),
        "net_debt": net_debt,
        "equity_value": round(equity_value, 4),
        "shares_outstanding": shares_outstanding,
        "fair_value_per_share": round(fair_per_share, 4),
    }


def dcf_sensitivity(
    free_cash_flow: float,
    net_debt: float,
    shares_outstanding: float,
    wacc_values: list[float],
    terminal_growth_values: list[float],
    base: DcfAssumptions | None = None,
) -> dict:
    """Fair value per share across a WACC x terminal-growth grid. Rows are
    WACC values, columns are growth values."""
    base = base or DcfAssumptions()
    grid: list[list[float | None]] = []
    for wacc in wacc_values:
        row: list[float | None] = []
        for g in terminal_growth_values:
            try:
                result = dcf_valuation(
                    free_cash_flow,
                    net_debt,
                    shares_outstanding,
                    replace(
                        base, wacc_pct=wacc, terminal_growth_pct=g
                    ),
                )
                row.append(result["fair_value_per_share"])
            except ValuationInputError:
                row.append(None)  # g >= wacc cell
        grid.append(row)
    return {
        "wacc_values": wacc_values,
        "terminal_growth_values": terminal_growth_values,
        "fair_values": grid,
    }


def gordon_growth_model(
    dividend_per_share: float, required_return_pct: float, growth_pct: float
) -> float | None:
    """DDM fair value; None when the model is undefined (r <= g, or no
    dividend) rather than inventing a number."""
    if dividend_per_share is None or dividend_per_share <= 0:
        return None
    r = required_return_pct / 100.0
    g = growth_pct / 100.0
    if r <= g:
        return None
    return round(dividend_per_share * (1.0 + g) / (r - g), 4)


def pe_fair_value(eps_ttm: float, target_pe: float) -> float:
    if eps_ttm <= 0:
        raise ValuationInputError("EPS must be positive for P/E valuation.")
    return round(eps_ttm * target_pe, 4)


def peg_assessment(
    pe_ttm: float, eps_growth_pct: float, benchmark_peg: float = 1.0
) -> dict:
    """PEG ratio check: a PEG of 1.0 is fair, below suggests the market
    underprices the growth, above the reverse."""
    if eps_growth_pct <= 0:
        raise ValuationInputError(
            "EPS growth must be positive for a PEG assessment."
        )
    peg = pe_ttm / eps_growth_pct
    implied_pe = eps_growth_pct * benchmark_peg
    return {
        "pe_ttm": pe_ttm,
        "eps_growth_pct": eps_growth_pct,
        "peg": round(peg, 4),
        "benchmark_peg": benchmark_peg,
        "implied_fair_pe": round(implied_pe, 4),
        "verdict": (
            "undervalued_on_growth"
            if peg < benchmark_peg * 0.85
            else "overvalued_on_growth"
            if peg > benchmark_peg * 1.15
            else "fairly_priced_on_growth"
        ),
    }


def ev_ebitda_fair_value(
    ebitda_ttm: float,
    target_multiple: float,
    net_debt: float,
    shares_outstanding: float,
) -> float:
    if ebitda_ttm <= 0:
        raise ValuationInputError("EBITDA must be positive for EV/EBITDA.")
    fair_ev = target_multiple * ebitda_ttm
    return round((fair_ev - net_debt) / shares_outstanding, 4)


SCENARIO_PRESETS: dict[str, dict[str, float]] = {
    "bear": {
        "stage1_growth_delta": -4.0,
        "terminal_growth_delta": -1.0,
        "wacc_delta": 1.5,
        "multiple_factor": 0.8,
    },
    "base": {
        "stage1_growth_delta": 0.0,
        "terminal_growth_delta": 0.0,
        "wacc_delta": 0.0,
        "multiple_factor": 1.0,
    },
    "bull": {
        "stage1_growth_delta": 4.0,
        "terminal_growth_delta": 1.0,
        "wacc_delta": -1.5,
        "multiple_factor": 1.2,
    },
}


def scenario_valuations(
    fundamentals: dict,
    price: float,
    base: DcfAssumptions,
    pe_target: float,
    ev_ebitda_target: float,
    ddm_growth_pct: float,
    required_return_pct: float,
    presets: dict[str, dict[str, float]] | None = None,
) -> list[dict]:
    """Bear/base/bull re-valuation: growth, discount rate and multiples flex
    together per preset. Every scenario reports each method's fair value and
    its implied upside vs the current price."""
    presets = presets or SCENARIO_PRESETS
    scenarios: list[dict] = []
    for name, preset in presets.items():
        dcf_assumptions = replace(
            base,
            stage1_growth_pct=base.stage1_growth_pct
            + preset["stage1_growth_delta"],
            terminal_growth_pct=base.terminal_growth_pct
            + preset["terminal_growth_delta"],
            wacc_pct=base.wacc_pct + preset["wacc_delta"],
        )
        scenario: dict = {"scenario": name, "assumptions": {}}
        methods: dict[str, float | None] = {}

        try:
            dcf = dcf_valuation(
                fundamentals["free_cash_flow_ttm"],
                fundamentals["net_debt"],
                fundamentals["shares_outstanding"],
                dcf_assumptions,
            )
            methods["dcf"] = dcf["fair_value_per_share"]
            scenario["assumptions"]["dcf"] = dcf["assumptions"]
        except ValuationInputError:
            methods["dcf"] = None

        factor = preset["multiple_factor"]
        if fundamentals.get("eps_ttm", 0) > 0:
            methods["pe"] = pe_fair_value(
                fundamentals["eps_ttm"], pe_target * factor
            )
        else:
            methods["pe"] = None
        if fundamentals.get("ebitda_ttm", 0) > 0:
            methods["ev_ebitda"] = ev_ebitda_fair_value(
                fundamentals["ebitda_ttm"],
                ev_ebitda_target * factor,
                fundamentals["net_debt"],
                fundamentals["shares_outstanding"],
            )
        else:
            methods["ev_ebitda"] = None
        methods["ddm"] = gordon_growth_model(
            fundamentals.get("dividend_per_share"),
            required_return_pct,
            ddm_growth_pct + preset["terminal_growth_delta"],
        )

        scenario["fair_values"] = {
            method: (
                {"value": v, "upside_pct": round((v / price - 1) * 100, 2)}
                if v is not None
                else None
            )
            for method, v in methods.items()
        }
        available = [v for v in methods.values() if v is not None]
        if available:
            blended = sum(available) / len(available)
            scenario["blended"] = {
                "value": round(blended, 4),
                "upside_pct": round((blended / price - 1) * 100, 2),
            }
        else:
            scenario["blended"] = None
        scenarios.append(scenario)
    return scenarios
