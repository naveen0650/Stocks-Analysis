import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { money, pct } from "../lib/format";
import { ErrorBanner, GlassCard, MetricCard, SectionTitle, Spinner } from "../components/ui";

interface FdResult {
  principal: number;
  maturity_value: number;
  total_interest: number;
  interest_share_pct: number;
  effective_annual_yield_pct: number;
  inputs: { effective_rate_pct: number; tenure_months: number; compounding: string };
  schedule: { year: number; opening: number; interest: number; closing: number; partial_year_months?: number }[];
  tax?: { slab_pct: number; tax_on_interest: number; post_tax_maturity: number; post_tax_gain_pct: number };
  inflation_adjusted?: { inflation_pct: number; real_maturity_value: number; real_gain: number };
  disclaimer: string;
}

interface MfResult {
  invested: number;
  final_value: number;
  gain: number;
  gain_pct: number;
  annualised_return_pct: number;
  expense_drag: number;
  inputs: { net_return_pct: number; expense_ratio_pct: number };
  schedule: { year: number; invested: number; value: number }[];
  inflation_adjusted?: { inflation_pct: number; real_final_value: number; real_gain: number };
  goal_seek?: { target_corpus: number; required_monthly_sip: number; reachable_without_sip: boolean };
  disclaimer: string;
}

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #bae6fd",
  borderRadius: 12,
  color: "#0f172a",
};

/** Light "floating panel" number field shared by both tabs. */
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

export default function Calculators() {
  const [tab, setTab] = useState<"fd" | "mf">("fd");

  // ---- FD form ----
  const [fd, setFd] = useState({
    principal: 200000,
    annual_rate_pct: 6.8,
    years: 5,
    months: 0,
    compounding: "quarterly",
    senior: false,
    senior_bonus_pct: 0.5,
    tax_slab_pct: 0,
    inflation_pct: 0,
  });
  const [fdResult, setFdResult] = useState<FdResult | null>(null);

  // ---- MF form ----
  const [mf, setMf] = useState({
    monthly_sip: 10000,
    initial_lumpsum: 50000,
    expected_return_pct: 12,
    years: 10,
    step_up_pct: 10,
    expense_ratio_pct: 1,
    inflation_pct: 6,
    use_target: false,
    target_corpus: 5000000,
  });
  const [mfResult, setMfResult] = useState<MfResult | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      api<FdResult>("/calculators/fd", {
        method: "POST",
        body: {
          principal: fd.principal,
          annual_rate_pct: fd.annual_rate_pct,
          years: fd.years,
          months: fd.months,
          compounding: fd.compounding,
          senior_citizen_bonus_pct: fd.senior ? fd.senior_bonus_pct : 0,
          tax_slab_pct: fd.tax_slab_pct > 0 ? fd.tax_slab_pct : null,
          inflation_pct: fd.inflation_pct > 0 ? fd.inflation_pct : null,
        },
      })
        .then(setFdResult)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [fd]);

  useEffect(() => {
    const timer = setTimeout(() => {
      api<MfResult>("/calculators/mutual-fund", {
        method: "POST",
        body: {
          monthly_sip: mf.monthly_sip,
          initial_lumpsum: mf.initial_lumpsum,
          expected_return_pct: mf.expected_return_pct,
          years: mf.years,
          step_up_pct: mf.step_up_pct,
          expense_ratio_pct: mf.expense_ratio_pct,
          inflation_pct: mf.inflation_pct > 0 ? mf.inflation_pct : null,
          target_corpus: mf.use_target ? mf.target_corpus : null,
        },
      })
        .then(setMfResult)
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(timer);
  }, [mf]);

  const num = (v: string | number): number => (Number(v) || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Calculators</h1>
        <p className="text-sm text-slate-600">
          Plan deposits and investments — every result updates as you tweak the inputs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded-2xl border border-sky-100 bg-white p-1 shadow-glass">
        {(
          [
            ["fd", "🏦 Fixed Deposit"],
            ["mf", "📈 Mutual Fund"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${
              tab === key
                ? "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sm"
                : "text-slate-600 hover:bg-sky-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      {/* ------------------------------------------------------ FD tab */}
      {tab === "fd" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <GlassCard className="p-5 lg:col-span-2">
            <SectionTitle title="Deposit details" subtitle="Bank-style compound interest" />
            <div className="space-y-3">
              <Field label="Principal amount (₹)">
                <input
                  type="number"
                  className="input"
                  min={500}
                  value={fd.principal}
                  onChange={(e) => setFd({ ...fd, principal: num(e.target.value) })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Interest rate (% p.a.)">
                  <input
                    type="number"
                    step={0.05}
                    className="input"
                    value={fd.annual_rate_pct}
                    onChange={(e) => setFd({ ...fd, annual_rate_pct: num(e.target.value) })}
                  />
                </Field>
                <Field label="Compounding">
                  <select
                    className="input"
                    value={fd.compounding}
                    onChange={(e) => setFd({ ...fd, compounding: e.target.value })}
                  >
                    <option value="yearly">Yearly</option>
                    <option value="half_yearly">Half-yearly</option>
                    <option value="quarterly">Quarterly (bank standard)</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tenure — years">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    className="input"
                    value={fd.years}
                    onChange={(e) => setFd({ ...fd, years: Math.min(num(e.target.value), 30) })}
                  />
                </Field>
                <Field label="Tenure — months">
                  <input
                    type="number"
                    min={0}
                    max={11}
                    className="input"
                    value={fd.months}
                    onChange={(e) => setFd({ ...fd, months: Math.min(num(e.target.value), 11) })}
                  />
                </Field>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-500"
                    checked={fd.senior}
                    onChange={(e) => setFd({ ...fd, senior: e.target.checked })}
                  />
                  Senior citizen (bonus rate)
                </label>
                {fd.senior && (
                  <div className="mt-2">
                    <Field label="Bonus rate (% p.a.)">
                      <input
                        type="number"
                        step={0.05}
                        className="input"
                        value={fd.senior_bonus_pct}
                        onChange={(e) => setFd({ ...fd, senior_bonus_pct: num(e.target.value) })}
                      />
                    </Field>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Income tax slab" hint="post-tax interest view">
                  <select
                    className="input"
                    value={fd.tax_slab_pct}
                    onChange={(e) => setFd({ ...fd, tax_slab_pct: num(e.target.value) })}
                  >
                    <option value={0}>Skip</option>
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                    <option value={20}>20%</option>
                    <option value={30}>30%</option>
                  </select>
                </Field>
                <Field label="Inflation (% p.a.)" hint="real value view">
                  <input
                    type="number"
                    step={0.5}
                    className="input"
                    value={fd.inflation_pct}
                    onChange={(e) => setFd({ ...fd, inflation_pct: num(e.target.value) })}
                  />
                </Field>
              </div>
            </div>
          </GlassCard>

          <div className="space-y-6 lg:col-span-3">
            {!fdResult ? (
              <Spinner label="Compounding…" />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard label="Maturity value" value={money(fdResult.maturity_value)} icon="🏁" tone="neutral" />
                  <MetricCard
                    label="Total interest"
                    value={money(fdResult.total_interest)}
                    hint={`${fdResult.interest_share_pct.toFixed(1)}% of maturity`}
                    icon="✨"
                    tone="positive"
                  />
                  <MetricCard
                    label="Effective yield"
                    value={`${fdResult.effective_annual_yield_pct.toFixed(2)}%`}
                    hint={`vs ${fdResult.inputs.effective_rate_pct}% nominal`}
                    icon="📊"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {fdResult.tax && (
                    <GlassCard className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        After {fdResult.tax.slab_pct}% tax on interest
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {money(fdResult.tax.post_tax_maturity)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        tax {money(fdResult.tax.tax_on_interest)} · net gain {fdResult.tax.post_tax_gain_pct}%
                      </p>
                    </GlassCard>
                  )}
                  {fdResult.inflation_adjusted && (
                    <GlassCard className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        In today's money ({fdResult.inflation_adjusted.inflation_pct}% inflation)
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {money(fdResult.inflation_adjusted.real_maturity_value)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        real gain {money(fdResult.inflation_adjusted.real_gain)}
                      </p>
                    </GlassCard>
                  )}
                </div>

                <GlassCard className="p-5">
                  <SectionTitle title="Growth over time" subtitle="Year-end closing balance" />
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={fdResult.schedule}>
                      <defs>
                        <linearGradient id="fdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(2,132,199,0.12)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => "₹" + Math.round(v).toLocaleString("en-IN")}
                        width={70}
                      />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(Number(v))} />
                      <Area type="monotone" dataKey="closing" name="Balance" stroke="#0284c7" strokeWidth={2} fill="url(#fdGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>

                <GlassCard className="p-5">
                  <SectionTitle title="Year-by-year schedule" />
                  <div className="max-h-64 overflow-y-auto slim-scroll">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="table-head">
                          <th className="py-1.5">Year</th>
                          <th className="py-1.5 text-right">Opening</th>
                          <th className="py-1.5 text-right">Interest</th>
                          <th className="py-1.5 text-right">Closing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fdResult.schedule.map((row) => (
                          <tr key={row.year} className="border-t border-sky-50">
                            <td className="py-2 font-medium text-slate-700">
                              {row.year}
                              {row.partial_year_months ? (
                                <span className="ml-1 text-[10px] text-slate-500">
                                  ({row.partial_year_months}m)
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 text-right text-slate-600">{money(row.opening)}</td>
                            <td className="py-2 text-right font-medium text-emerald-600">{money(row.interest)}</td>
                            <td className="py-2 text-right font-semibold text-slate-900">{money(row.closing)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">{fdResult.disclaimer}</p>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ MF tab */}
      {tab === "mf" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <GlassCard className="p-5 lg:col-span-2">
            <SectionTitle title="Investment details" subtitle="SIP, lumpsum, or both" />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly SIP (₹)" hint="0 to skip">
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={mf.monthly_sip}
                    onChange={(e) => setMf({ ...mf, monthly_sip: num(e.target.value) })}
                  />
                </Field>
                <Field label="One-time lumpsum (₹)" hint="0 to skip">
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={mf.initial_lumpsum}
                    onChange={(e) => setMf({ ...mf, initial_lumpsum: num(e.target.value) })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expected return (% p.a.)">
                  <input
                    type="number"
                    step={0.5}
                    className="input"
                    value={mf.expected_return_pct}
                    onChange={(e) => setMf({ ...mf, expected_return_pct: num(e.target.value) })}
                  />
                </Field>
                <Field label="Tenure (years)">
                  <input
                    type="number"
                    min={1}
                    max={40}
                    className="input"
                    value={mf.years}
                    onChange={(e) => setMf({ ...mf, years: Math.max(1, Math.min(num(e.target.value), 40)) })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Annual step-up (%)" hint="raise SIP each year">
                  <input
                    type="number"
                    min={0}
                    max={25}
                    className="input"
                    value={mf.step_up_pct}
                    onChange={(e) => setMf({ ...mf, step_up_pct: num(e.target.value) })}
                  />
                </Field>
                <Field label="Expense ratio (% p.a.)" hint="fund's TER">
                  <input
                    type="number"
                    step={0.05}
                    min={0}
                    max={3}
                    className="input"
                    value={mf.expense_ratio_pct}
                    onChange={(e) => setMf({ ...mf, expense_ratio_pct: num(e.target.value) })}
                  />
                </Field>
              </div>
              <Field label="Inflation (% p.a.)" hint="real-value view">
                <input
                  type="number"
                  step={0.5}
                  className="input"
                  value={mf.inflation_pct}
                  onChange={(e) => setMf({ ...mf, inflation_pct: num(e.target.value) })}
                />
              </Field>
              <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-sky-500"
                    checked={mf.use_target}
                    onChange={(e) => setMf({ ...mf, use_target: e.target.checked })}
                  />
                  Goal target (find required SIP)
                </label>
                {mf.use_target && (
                  <div className="mt-2">
                    <Field label="Target corpus (₹)">
                      <input
                        type="number"
                        className="input"
                        value={mf.target_corpus}
                        onChange={(e) => setMf({ ...mf, target_corpus: num(e.target.value) })}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          <div className="space-y-6 lg:col-span-3">
            {!mfResult ? (
              <Spinner label="Projecting…" />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard label="Projected value" value={money(mfResult.final_value)} icon="🎯" tone="neutral" />
                  <MetricCard label="You invest" value={money(mfResult.invested)} icon="₹" />
                  <MetricCard
                    label="Wealth gained"
                    value={money(mfResult.gain)}
                    delta={pct(mfResult.gain_pct)}
                    hint={`${mfResult.annualised_return_pct.toFixed(2)}% p.a. (XIRR)`}
                    icon="📈"
                    tone="positive"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {mfResult.expense_drag > 0 && (
                    <GlassCard className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Cost of the {mfResult.inputs.expense_ratio_pct}% expense ratio
                      </p>
                      <p className="mt-1 text-xl font-bold text-rose-600">-{money(mfResult.expense_drag)}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        what the fund's TER chips off vs a zero-cost fund
                      </p>
                    </GlassCard>
                  )}
                  {mfResult.inflation_adjusted && (
                    <GlassCard className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        In today's money ({mfResult.inflation_adjusted.inflation_pct}% inflation)
                      </p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {money(mfResult.inflation_adjusted.real_final_value)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        real gain {money(mfResult.inflation_adjusted.real_gain)}
                      </p>
                    </GlassCard>
                  )}
                  {mfResult.goal_seek && (
                    <GlassCard className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        To reach {money(mfResult.goal_seek.target_corpus)}
                      </p>
                      <p className="mt-1 text-xl font-bold text-sky-600">
                        {money(mfResult.goal_seek.required_monthly_sip)}<span className="text-sm font-medium text-slate-500"> / month</span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {mfResult.goal_seek.reachable_without_sip
                          ? "your lumpsum alone gets you there"
                          : "required SIP under the same assumptions"}
                      </p>
                    </GlassCard>
                  )}
                </div>

                <GlassCard className="p-5">
                  <SectionTitle
                    title="Invested vs projected value"
                    subtitle={mfResult.inputs.net_return_pct < mf.expected_return_pct ? `net of the ${ (mf.expected_return_pct - mfResult.inputs.net_return_pct).toFixed(2)}% expense ratio` : undefined}
                  />
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={mfResult.schedule}>
                      <defs>
                        <linearGradient id="mfVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="mfInv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(2,132,199,0.12)" vertical={false} />
                      <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => "₹" + Math.round(v).toLocaleString("en-IN")}
                        width={70}
                      />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="value" name="Value" stroke="#0284c7" strokeWidth={2} fill="url(#mfVal)" />
                      <Area type="monotone" dataKey="invested" name="Invested" stroke="#059669" strokeWidth={1.6} fill="url(#mfInv)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </GlassCard>

                <GlassCard className="p-5">
                  <SectionTitle title="Year-by-year projection" />
                  <div className="max-h-64 overflow-y-auto slim-scroll">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white">
                        <tr className="table-head">
                          <th className="py-1.5">Year</th>
                          <th className="py-1.5 text-right">Invested</th>
                          <th className="py-1.5 text-right">Value</th>
                          <th className="py-1.5 text-right">Gain</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mfResult.schedule.map((row) => (
                          <tr key={row.year} className="border-t border-sky-50">
                            <td className="py-2 font-medium text-slate-700">{row.year}</td>
                            <td className="py-2 text-right text-slate-600">{money(row.invested)}</td>
                            <td className="py-2 text-right font-semibold text-slate-900">{money(row.value)}</td>
                            <td className="py-2 text-right font-medium text-emerald-600">
                              {money(row.value - row.invested)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">{mfResult.disclaimer}</p>
                </GlassCard>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
