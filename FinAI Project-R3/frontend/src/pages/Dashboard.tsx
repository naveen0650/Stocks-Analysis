import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { dateLabel, money, moneyCompact, pct } from "../lib/format";
import { EmptyState, ErrorBanner, GlassCard, MetricCard, SectionTitle, Spinner } from "../components/ui";

interface DashboardData {
  month: {
    total_income: number;
    total_expenses: number;
    savings: number;
    savings_rate_pct: number | null;
    transaction_count: number;
    top_category: { category: string; share_pct: number } | null;
  };
  today_expense_total: number;
  trends: {
    monthly: { month: string; expenses: number; income: number; savings: number }[];
    expense_mom_pct: number | null;
  };
  recent_expenses: {
    id: number;
    category: string;
    amount: number;
    merchant: string | null;
    date: string;
  }[];
  budgets: {
    id: number;
    name: string;
    amount: number;
    actual: number;
    utilization_pct: number;
    triggered_alerts: number[];
    is_active: boolean;
  }[];
  insights: {
    type: string;
    severity: string;
    title: string;
    message: string;
  }[];
  health: { score: number; grade: string };
  data_freshness: { expenses_as_of: string };
}

const SEVERITY_STYLE: Record<string, string> = {
  critical: "border-rose-500/40 bg-rose-500/10",
  warning: "border-amber/40 bg-amber/10",
  info: "border-aurora-400/30 bg-aurora-500/10",
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<DashboardData>("/analytics/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner label="Crunching your numbers…" />;

  const m = data.month;
  const hasExpenseHistory = m.transaction_count > 0 || data.trends.monthly.some((t) => t.expenses > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Your financial snapshot · data as of {dateLabel(data.data_freshness.expenses_as_of)}
          </p>
        </div>
        <span className="chip">Health score: {data.health.score} · {data.health.grade}</span>
      </div>

      {/* Financial snapshot */}
      <section aria-label="Financial snapshot">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Income (this month)"
            value={money(m.total_income)}
            tone="positive"
            icon="↑"
          />
          <MetricCard
            label="Expenses (this month)"
            value={money(m.total_expenses)}
            delta={data.trends.expense_mom_pct === null ? null : pct(data.trends.expense_mom_pct)}
            hint="vs last month"
            tone="danger"
            icon="↓"
          />
          <MetricCard
            label="Savings"
            value={money(m.savings)}
            hint={m.savings_rate_pct === null ? "no income recorded" : `${m.savings_rate_pct}% of income`}
            tone="neutral"
            icon="≡"
          />
          <MetricCard
            label="Today's spending"
            value={money(data.today_expense_total)}
            hint={`${m.transaction_count} transactions this month`}
            tone="warning"
            icon="◷"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Cash-flow trend */}
        <GlassCard className="p-5 xl:col-span-2">
          <SectionTitle title="Cash flow" subtitle="Income vs expenses, last 6 months" />
          {hasExpenseHistory ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.trends.monthly}>
                <defs>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => moneyCompact(v)}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #bae6fd",
                    borderRadius: 12,
                    color: "#0f172a",
                  }}
                  formatter={(value: number) => money(value)}
                />
                <Area type="monotone" dataKey="income" stroke="#34d399" fill="url(#gInc)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#fb7185" fill="url(#gExp)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon="📊"
              title="No expense history yet"
              hint="Add your first expenses to unlock trends, AI insights and your financial health score."
            />
          )}
        </GlassCard>

        {/* AI insights */}
        <GlassCard className="p-5">
          <SectionTitle title="AI insights" subtitle="Derived from your own data" />
          {data.insights.length === 0 ? (
            <EmptyState
              icon="✦"
              title="No insights yet"
              hint="Insights appear after a little history accumulates (about two months works best)."
            />
          ) : (
            <ul className="space-y-3">
              {data.insights.slice(0, 4).map((insight, i) => (
                <li
                  key={i}
                  className={`rounded-xl border p-3.5 text-sm ${SEVERITY_STYLE[insight.severity] ?? SEVERITY_STYLE.info}`}
                >
                  <p className="font-semibold text-slate-900">{insight.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{insight.message}</p>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/app/insights"
            className="mt-4 inline-block text-xs font-semibold text-aurora-300 hover:text-sky-700"
          >
            View all insights →
          </Link>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent transactions */}
        <GlassCard className="p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="Recent transactions" />
            <Link to="/app/expenses" className="text-xs font-semibold text-aurora-300 hover:text-sky-700">
              Manage expenses →
            </Link>
          </div>
          {data.recent_expenses.length === 0 ? (
            <EmptyState icon="🧾" title="Nothing recorded in the last 7 days" />
          ) : (
            <div className="overflow-x-auto slim-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sky-100">
                    <th className="table-head pb-2">Date</th>
                    <th className="table-head pb-2">Category</th>
                    <th className="table-head pb-2">Merchant</th>
                    <th className="table-head pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_expenses.map((e) => (
                    <tr key={e.id} className="border-b border-sky-100 last:border-0">
                      <td className="py-2.5 text-slate-600">{dateLabel(e.date)}</td>
                      <td className="py-2.5">
                        <span className="chip">{e.category}</span>
                      </td>
                      <td className="py-2.5 text-slate-600">{e.merchant ?? "—"}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">{money(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Budget status */}
        <GlassCard className="p-5">
          <SectionTitle title="Budgets" subtitle="Current utilization" />
          {data.budgets.length === 0 ? (
            <EmptyState icon="◎" title="No budgets yet" hint="Create one to track spending limits." />
          ) : (
            <ul className="space-y-4">
              {data.budgets.filter((b) => b.is_active).map((b) => {
                const over = b.utilization_pct >= 100;
                return (
                  <li key={b.id}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span className="font-medium text-slate-700">{b.name}</span>
                      <span className={over ? "text-rose" : "text-slate-600"}>
                        {b.utilization_pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          over ? "bg-rose" : b.utilization_pct >= 75 ? "bg-amber" : "bg-mint"
                        }`}
                        style={{ width: `${Math.min(b.utilization_pct, 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {money(b.actual)} of {money(b.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            to="/app/budgets"
            className="mt-4 inline-block text-xs font-semibold text-aurora-300 hover:text-sky-700"
          >
            Manage budgets →
          </Link>
        </GlassCard>
      </div>

      {/* Market snapshot placeholder (Phase 2 via provider abstraction) */}
      <GlassCard className="p-5">
        <SectionTitle
          title="Market snapshot"
          subtitle="Live indices & FX arrive in Phase 2 through the financial-data provider layer"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {["NIFTY 50", "SENSEX", "USD/INR", "GOLD"].map((name) => (
            <div key={name} className="rounded-xl border border-sky-100 bg-sky-50/70 p-3.5 text-center">
              <p className="text-xs font-medium text-slate-600">{name}</p>
              <p className="mt-1 text-sm font-semibold text-slate-600">Data unavailable</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          The platform never fabricates market data — values appear once a provider is configured.
        </p>
      </GlassCard>
    </div>
  );
}
