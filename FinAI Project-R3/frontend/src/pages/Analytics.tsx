import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { dateLabel, money, moneyCompact, pct } from "../lib/format";
import { EmptyState, ErrorBanner, GlassCard, MetricCard, SectionTitle, Spinner } from "../components/ui";

interface Trends {
  monthly: { month: string; expenses: number; income: number; savings: number }[];
  expense_mom_pct: number | null;
}

interface Categories {
  distribution: { category: string; total: number; share_pct: number }[];
  top_merchants: { merchant: string; total: number }[];
}

interface Anomalies {
  window: { from: string; to: string };
  flags: {
    kind: string;
    expense_date: string | null;
    category: string | null;
    merchant: string | null;
    amount: number;
    z_score: number;
    explanation: string;
  }[];
  analyzed_transactions: number;
}

const CHART_COLORS = ["#0ea5e9", "#34d399", "#fbbf24", "#fb7185", "#0284c7", "#22d3ee", "#a78bfa", "#f472b6"];

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #bae6fd",
  borderRadius: 12,
  color: "#0f172a",
};

export default function Analytics() {
  const [trends, setTrends] = useState<Trends | null>(null);
  const [categories, setCategories] = useState<Categories | null>(null);
  const [anomalies, setAnomalies] = useState<Anomalies | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Trends>("/analytics/trends?months=12"),
      api<Categories>("/analytics/categories"),
      api<Anomalies>("/analytics/anomalies"),
    ])
      .then(([t, c, a]) => {
        setTrends(t);
        setCategories(c);
        setAnomalies(a);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!trends || !categories || !anomalies) return <Spinner label="Building analytics…" />;

  const hasData = trends.monthly.some((m) => m.expenses > 0 || m.income > 0);
  const monthExpense =
    trends.monthly.length > 0 ? trends.monthly[trends.monthly.length - 1].expenses : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Analytics</h1>
        <p className="text-sm text-slate-600">Where your money actually goes</p>
      </div>

      {hasData ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="This month"
              value={money(monthExpense)}
              icon="◫"
              tone="neutral"
            />
            <MetricCard
              label="Month-on-month"
              value={trends.expense_mom_pct === null ? "—" : pct(trends.expense_mom_pct)}
              hint="change vs last month"
              icon="⇅"
              tone={
                trends.expense_mom_pct !== null && trends.expense_mom_pct > 0
                  ? "danger"
                  : "positive"
              }
            />
            <MetricCard
              label="Anomalies (90 days)"
              value={String(anomalies.flags.length)}
              hint={`${anomalies.analyzed_transactions} transactions analysed`}
              icon="⚑"
              tone={anomalies.flags.length > 0 ? "warning" : "positive"}
            />
          </div>

          <GlassCard className="p-5">
            <SectionTitle title="Monthly trend" subtitle="Last 12 months" />
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trends.monthly}>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => moneyCompact(v)} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="expenses" stroke="#fb7185" strokeWidth={2.5} dot={false} name="Expenses" />
                <Line type="monotone" dataKey="income" stroke="#34d399" strokeWidth={2.5} dot={false} name="Income" />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <GlassCard className="p-5">
              <SectionTitle title="Category distribution" subtitle="Current month" />
              {categories.distribution.length === 0 ? (
                <EmptyState icon="◔" title="No spending this month yet" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={categories.distribution}
                        dataKey="total"
                        nameKey="category"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {categories.distribution.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="mt-2 space-y-1.5">
                    {categories.distribution.slice(0, 6).map((d, i) => (
                      <li key={d.category} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          {d.category}
                        </span>
                        <span className="text-slate-600">
                          {money(d.total)} · {d.share_pct}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <SectionTitle title="Top merchants" subtitle="Current month" />
              {categories.top_merchants.length === 0 ? (
                <EmptyState icon="🏪" title="No merchant data this month" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categories.top_merchants} layout="vertical">
                    <CartesianGrid stroke="rgba(148,163,184,0.1)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => moneyCompact(v)} />
                    <YAxis type="category" dataKey="merchant" width={100}
                      tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => money(value)} />
                    <Bar dataKey="total" fill="#0ea5e9" radius={[0, 8, 8, 0]} barSize={22} name="Spend" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <SectionTitle
              title="Unusual spending detected"
              subtitle={`Z-score analysis over ${dateLabel(anomalies.window.from)} – ${dateLabel(anomalies.window.to)}`}
            />
            {anomalies.flags.length === 0 ? (
              <EmptyState icon="✓" title="Nothing unusual" hint="No transactions stand out statistically. This is good." />
            ) : (
              <ul className="space-y-3">
                {anomalies.flags.map((f, i) => (
                  <li key={i} className="rounded-xl border border-amber/30 bg-amber/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {f.category ?? "Daily total"}
                        {f.merchant ? ` · ${f.merchant}` : ""}
                      </p>
                      <span className="chip border-amber/40 text-amber">
                        z = {f.z_score}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-600">{f.explanation}</p>
                    {f.expense_date && (
                      <p className="mt-1 text-xs text-slate-500">{dateLabel(f.expense_date)}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </>
      ) : (
        <GlassCard className="p-5">
          <EmptyState
            icon="📊"
            title="Analytics unlock with data"
            hint="Record a few expenses and income entries, then return here."
          />
        </GlassCard>
      )}
    </div>
  );
}
