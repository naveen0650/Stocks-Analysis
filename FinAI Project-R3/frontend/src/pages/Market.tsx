import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { money, pct } from "../lib/format";
import { ErrorBanner, GlassCard, MetricCard, SectionTitle, Spinner } from "../components/ui";
import FairValuePanel, { type FairValue, type NewsBuzz } from "../components/FairValuePanel";

interface SymbolInfo {
  symbol: string;
  name: string;
  currency: string;
  sector: string;
  price?: number;
  change_pct?: number;
  bars_from: string;
  bars_to: string;
  bar_count: number;
}

interface Factor {
  key: string;
  label: string;
  weight: number;
  effective_weight: number | null;
  factor_score: number | null;
  contribution: number | null;
  status: "evaluated" | "not_evaluated";
  reason: string | null;
  value: number | null;
}

interface MethodRow {
  method: string;
  fair_value_per_share: number;
  upside_pct: number;
  note: string;
}

interface Scenario {
  scenario: string;
  blended: { value: number; upside_pct: number } | null;
}

interface Valuation {
  price_used: number;
  methods: MethodRow[];
  blended_fair_value_per_share: number | null;
  blended_upside_pct: number | null;
  dcf: { fair_value_per_share: number; terminal_value_share_pct: number };
  sensitivity: {
    wacc_values: number[];
    terminal_growth_values: number[];
    fair_values: (number | null)[][];
  };
  scenarios: Scenario[];
}

interface Analysis {
  symbol: string;
  name: string | null;
  sector: string | null;
  currency: string;
  source: string;
  as_of: string;
  price: { current: number; previous_close: number | null; change_pct: number | null };
  indicators: {
    sma_20: number | null;
    sma_50: number | null;
    price_vs_sma_20_pct: number | null;
    rsi_14: number | null;
    macd: { line: number | null; signal: number | null; histogram: number | null };
    bollinger: { upper: number | null; middle: number | null; lower: number | null };
    returns_pct: { month_1: number | null; months_3: number | null; months_6: number | null };
    max_drawdown_pct: number | null;
    annualized_volatility_pct: number | null;
  };
  series: {
    dates: string[];
    close: (number | null)[];
    sma_20: (number | null)[];
    sma_50: (number | null)[];
    bollinger_upper: (number | null)[];
    bollinger_lower: (number | null)[];
  };
  valuation: Valuation;
  score: { score: number; grade: string; factors: Factor[]; disclaimer: string };
  fair_value: FairValue | null;
  news: NewsBuzz;
  disclaimer: string;
}

interface Assumptions {
  wacc_pct: number;
  stage1_growth_pct: number;
  terminal_growth_pct: number;
  pe_target: number;
}

const METHOD_LABELS: Record<string, string> = {
  dcf: "DCF (5y + terminal)",
  pe: "P/E multiple",
  ev_ebitda: "EV/EBITDA multiple",
  ddm: "Dividend discount",
  peg_implied: "PEG-implied P/E",
};

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #bae6fd",
  borderRadius: 12,
  color: "#0f172a",
};

function scoreColor(score: number): string {
  if (score >= 70) return "#059669";
  if (score >= 55) return "#0284c7";
  if (score >= 40) return "#d97706";
  return "#e11d48";
}

function upsideTone(upside: number | null): string {
  if (upside === null) return "text-slate-500";
  return upside >= 0 ? "text-emerald-600" : "text-rose-600";
}

/** Phase 2 · recorded-sample stock analysis — indicators, valuation, score. */
export default function Market() {
  const [symbols, setSymbols] = useState<SymbolInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [form, setForm] = useState<Assumptions>({
    wacc_pct: 10.5,
    stage1_growth_pct: 14,
    terminal_growth_pct: 4.5,
    pe_target: 22,
  });
  const [revaluing, setRevaluing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ symbols: SymbolInfo[] }>("/market/symbols")
      .then((r) => {
        setSymbols(r.symbols);
        if (r.symbols.length > 0) setSelected(r.symbols[0].symbol);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setAnalysis(null);
    setValuation(null);
    api<Analysis>(`/market/${encodeURIComponent(selected)}/analysis`)
      .then(setAnalysis)
      .catch((e) => setError(e.message));
  }, [selected]);

  const chartRows = useMemo(() => {
    if (!analysis) return [];
    const s = analysis.series;
    return s.dates.map((date, i) => ({
      date,
      close: s.close[i] ?? undefined,
      sma_20: s.sma_20[i] ?? undefined,
      sma_50: s.sma_50[i] ?? undefined,
      upper: s.bollinger_upper[i] ?? undefined,
      lower: s.bollinger_lower[i] ?? undefined,
    }));
  }, [analysis]);

  async function revalue() {
    if (!selected) return;
    setRevaluing(true);
    try {
      const v = await api<Valuation>(`/market/${encodeURIComponent(selected)}/valuation`, {
        method: "POST",
        body: form,
      });
      setValuation(v);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRevaluing(false);
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (symbols.length === 0) return <Spinner label="Loading market data…" />;

  const shown: Valuation | null = valuation ?? analysis?.valuation ?? null;

  const sectors = useMemo(() => {
    const s = Array.from(new Set(symbols.map((item) => item.sector))).sort();
    return ["All", ...s];
  }, [symbols]);

  const filteredSymbols = useMemo(() => {
    return symbols.filter((s) => {
      const matchSector = sectorFilter === "All" || s.sector === sectorFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q);
      return matchSector && matchQuery;
    });
  }, [symbols, sectorFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            NIFTY 50 Market & Fair Value Intelligence
          </h1>
          <p className="text-sm text-slate-600">
            Market-adjusted fair value, technical confluence, news sentiment buzz, and DCF sensitivity
          </p>
        </div>
        <span className="chip border-amber/40 text-amber">
          ⚠ {analysis?.source ?? "recorded-sample"} data — not live prices
        </span>
      </div>

      {/* NIFTY 50 Watchlist & Sector Screener */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {sectors.map((sec) => (
              <button
                key={sec}
                onClick={() => setSectorFilter(sec)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  sectorFilter === sec
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-sky-50 text-slate-600 hover:bg-sky-100"
                }`}
              >
                {sec}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search symbol or company…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input max-w-xs !py-1.5 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filteredSymbols.map((s) => {
            const active = selected === s.symbol;
            const isUp = (s.change_pct ?? 0) >= 0;
            return (
              <button
                key={s.symbol}
                onClick={() => setSelected(s.symbol)}
                className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                  active
                    ? "border-sky-500 bg-sky-50/90 ring-2 ring-sky-500/20 shadow-sm"
                    : "border-slate-200/80 bg-white hover:border-sky-300 hover:bg-sky-50/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">
                      {s.symbol.replace(".NS", "")}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">
                      NSE
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500" title={s.name}>
                    {s.name.replace(" [sample]", "")}
                  </p>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-slate-100 pt-1.5">
                  <span className="text-xs font-semibold text-slate-800">
                    {s.price ? money(s.price) : "—"}
                  </span>
                  {s.change_pct !== undefined && (
                    <span
                      className={`text-[10px] font-semibold ${
                        isUp ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isUp ? "+" : ""}
                      {s.change_pct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {!analysis ? (
        <Spinner label="Running the analysis engines…" />
      ) : (
        <>
          {/* Selected Stock Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  {analysis.name?.replace(" [sample]", "") ?? analysis.symbol}
                </h2>
                <span className="rounded-md bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
                  {analysis.symbol}
                </span>
                {analysis.sector && (
                  <span className="chip border-sky-200 bg-white text-slate-700">
                    {analysis.sector}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Data as of {analysis.as_of} · Currency: {analysis.currency}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900">{money(analysis.price.current)}</p>
              {analysis.price.change_pct !== null && (
                <p
                  className={`text-xs font-semibold ${
                    analysis.price.change_pct >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {pct(analysis.price.change_pct)} today (prev {money(analysis.price.previous_close)})
                </p>
              )}
            </div>
          </div>

          {analysis.fair_value && <FairValuePanel fv={analysis.fair_value} news={analysis.news} />}

          {/* Headline metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={`Price · ${analysis.as_of}`}
              value={money(analysis.price.current)}
              delta={
                analysis.price.change_pct === null
                  ? null
                  : `${pct(analysis.price.change_pct)} today`
              }
              icon="◈"
            />
            <MetricCard
              label="Blended fair value"
              value={money(shown?.blended_fair_value_per_share ?? null)}
              delta={
                shown?.blended_upside_pct === null || shown === null
                  ? undefined
                  : pct(shown.blended_upside_pct)
              }
              hint="avg of all methods"
              icon="⌖"
              tone={
                (shown?.blended_upside_pct ?? 0) >= 0 ? "positive" : "danger"
              }
            />
            <MetricCard
              label="6-month return"
              value={pct(analysis.indicators.returns_pct.months_6)}
              hint={`vol ${analysis.indicators.annualized_volatility_pct?.toFixed(1) ?? "—"}%`}
              icon="⇅"
              tone={
                (analysis.indicators.returns_pct.months_6 ?? 0) >= 0
                  ? "positive"
                  : "danger"
              }
            />
            <GlassCard hover className="animate-fade-up p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-600">
                Stock score
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: scoreColor(analysis.score.score) }}
                >
                  {analysis.score.score}
                </p>
                <p className="text-sm font-semibold" style={{ color: scoreColor(analysis.score.score) }}>
                  {analysis.score.grade}
                </p>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {analysis.score.factors.filter((f) => f.status === "evaluated").length} of{" "}
                {analysis.score.factors.length} factors evaluated
              </p>
            </GlassCard>
          </div>

          {/* Price chart */}
          <GlassCard className="p-5">
            <SectionTitle
              title="Price, moving averages & Bollinger bands"
              subtitle={`${analysis.name ?? analysis.symbol} · ${analysis.series.dates.length} trading days · SMA 20/50, 2σ bands`}
            />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartRows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(2,132,199,0.12)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(v: number) => v.toFixed(0)}
                  width={56}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="close" name="Close" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sma_20" name="SMA 20" stroke="#34d399" strokeWidth={1.4} dot={false} />
                <Line type="monotone" dataKey="sma_50" name="SMA 50" stroke="#fbbf24" strokeWidth={1.4} dot={false} />
                <Line type="monotone" dataKey="upper" name="Bollinger +" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                <Line type="monotone" dataKey="lower" name="Bollinger −" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5">
                <p className="text-slate-500">RSI (14)</p>
                <p className="mt-0.5 font-semibold text-slate-900">
                  {analysis.indicators.rsi_14?.toFixed(1) ?? "—"}
                  <span className="ml-2 text-[10px] font-normal text-slate-500">
                    {analysis.indicators.rsi_14 === null
                      ? ""
                      : analysis.indicators.rsi_14 >= 70
                        ? "overbought"
                        : analysis.indicators.rsi_14 <= 30
                          ? "oversold"
                          : "neutral"}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5">
                <p className="text-slate-500">MACD histogram</p>
                <p className={`mt-0.5 font-semibold ${upsideTone(analysis.indicators.macd.histogram)}`}>
                  {analysis.indicators.macd.histogram?.toFixed(2) ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5">
                <p className="text-slate-500">Price vs SMA-20</p>
                <p className={`mt-0.5 font-semibold ${upsideTone(analysis.indicators.price_vs_sma_20_pct)}`}>
                  {pct(analysis.indicators.price_vs_sma_20_pct)}
                </p>
              </div>
              <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-2.5">
                <p className="text-slate-500">Max drawdown (6m)</p>
                <p className="mt-0.5 font-semibold text-rose">
                  {analysis.indicators.max_drawdown_pct?.toFixed(1) ?? "—"}%
                </p>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Valuation methods + assumptions */}
            <GlassCard className="p-5 lg:col-span-3">
              <SectionTitle
                title="Valuation — every method, every assumption"
                subtitle={
                  valuation
                    ? "Re-computed with your assumptions"
                    : "Default assumptions — edit them on the right"
                }
              />
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 text-right font-medium">Fair value</th>
                    <th className="pb-2 text-right font-medium">Upside</th>
                  </tr>
                </thead>
                <tbody>
                  {shown?.methods.map((m) => (
                    <tr key={m.method} className="border-t border-sky-100">
                      <td className="py-2.5">
                        <p className="font-medium text-slate-900">{METHOD_LABELS[m.method] ?? m.method}</p>
                        <p className="text-[11px] leading-snug text-slate-500">{m.note}</p>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">
                        {money(m.fair_value_per_share)}
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${upsideTone(m.upside_pct)}`}>
                        {pct(m.upside_pct)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-aurora-400/30">
                    <td className="py-2.5 font-bold text-aurora-300">Blended</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {money(shown?.blended_fair_value_per_share ?? null)}
                    </td>
                    <td className={`py-2.5 text-right font-bold ${upsideTone(shown?.blended_upside_pct ?? null)}`}>
                      {pct(shown?.blended_upside_pct ?? null)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-slate-500">
                DCF terminal value is {shown?.dcf.terminal_value_share_pct.toFixed(0) ?? "—"}% of
                enterprise value — long-horizon assumptions dominate, which is exactly why the
                sensitivity grid and scenarios exist.
              </p>

              {/* Scenarios */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                {shown?.scenarios.map((s) => (
                  <div key={s.scenario} className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      {s.scenario}
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {money(s.blended?.value ?? null)}
                    </p>
                    <p className={`text-xs font-semibold ${upsideTone(s.blended?.upside_pct ?? null)}`}>
                      {pct(s.blended?.upside_pct ?? null)}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Assumptions editor + sensitivity */}
            <div className="space-y-6 lg:col-span-2">
              <GlassCard className="p-5">
                <SectionTitle title="Your assumptions" subtitle="Re-value instantly" />
                <div className="space-y-3">
                  {(
                    [
                      ["wacc_pct", "Discount rate (WACC %)", 0.5],
                      ["stage1_growth_pct", "FCF growth, years 1–5 (%)", 1],
                      ["terminal_growth_pct", "Terminal growth (%)", 0.5],
                      ["pe_target", "Target P/E (×)", 1],
                    ] as [keyof Assumptions, string, number][]
                  ).map(([key, label, step]) => (
                    <label key={key} className="block">
                      <span className="mb-1 block text-xs text-slate-600">{label}</span>
                      <input
                        type="number"
                        step={step}
                        className="input !py-1.5 text-sm"
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: Number(e.target.value) })
                        }
                      />
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={revalue} disabled={revaluing} className="btn-primary flex-1 !py-2 text-sm">
                      {revaluing ? "Re-valuing…" : "Re-value"}
                    </button>
                    <button
                      onClick={() => setValuation(null)}
                      className="btn-ghost !px-3 !py-2 text-sm"
                      title="Back to the default assumptions"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <SectionTitle
                  title="DCF sensitivity"
                  subtitle="Fair value per share — WACC ↓ vs terminal growth →"
                />
                <div className="overflow-x-auto slim-scroll">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr>
                        <th className="px-1 pb-1 text-left font-medium text-slate-500">WACC %</th>
                        {shown?.sensitivity.terminal_growth_values.map((g) => (
                          <th key={g} className="px-1 pb-1 text-right font-medium text-slate-500">
                            {g.toFixed(0)}%
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown?.sensitivity.wacc_values.map((w, i) => (
                        <tr key={w}>
                          <td className="px-1 py-0.5 font-medium text-slate-600">{w.toFixed(1)}</td>
                          {shown.sensitivity.fair_values[i].map((v, j) => {
                            const row = shown.sensitivity.fair_values[i].filter(Boolean) as number[];
                            const min = Math.min(...row);
                            const max = Math.max(...row);
                            const t = v === null ? 0 : (v - min) / (max - min || 1);
                            return (
                              <td
                                key={j}
                                className="px-1 py-0.5 text-right font-semibold text-slate-900"
                                style={{
                                  background:
                                    v === null
                                      ? "rgba(100,116,139,0.15)"
                                      : `rgba(2,132,199,${0.12 + t * 0.55})`,
                                  borderRadius: 4,
                                }}
                              >
                                {v === null ? "—" : v.toFixed(0)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Score factors */}
          <GlassCard className="p-5">
            <SectionTitle
              title="Why this score"
              subtitle="Same explainability contract as the financial health score — weights redistribute when data is missing"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {analysis.score.factors.map((f) => (
                <div key={f.key} className="rounded-xl border border-sky-100 bg-sky-50/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{f.label}</span>
                    {f.status === "evaluated" && f.factor_score !== null ? (
                      <span className="text-sm font-bold" style={{ color: scoreColor(f.factor_score) }}>
                        {f.factor_score.toFixed(0)}
                        <span className="ml-1.5 text-xs font-normal text-slate-500">
                          → +{f.contribution?.toFixed(1)} pts
                        </span>
                      </span>
                    ) : (
                      <span className="chip border-slate-200 bg-slate-100 text-slate-500">not evaluated</span>
                    )}
                  </div>
                  {f.status === "evaluated" ? (
                    <>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${f.factor_score ?? 0}%`,
                            background: scoreColor(f.factor_score ?? 0),
                          }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        value {f.value?.toFixed(2)} · weight{" "}
                        {(f.effective_weight ?? f.weight).toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1.5 text-[11px] italic text-slate-500">{f.reason}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">{analysis.disclaimer}</p>
          </GlassCard>
        </>
      )}
    </div>
  );
}
