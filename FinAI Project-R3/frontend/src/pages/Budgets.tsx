import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { money } from "../lib/format";
import { EmptyState, ErrorBanner, GlassCard, SectionTitle, Spinner } from "../components/ui";

interface Category {
  id: number;
  name: string;
  is_system: boolean;
}

interface Budget {
  id: number;
  name: string;
  period: string;
  category_id: number | null;
  category_name: string | null;
  amount: string;
  actual: number;
  remaining: number;
  utilization_pct: number;
  triggered_alerts: number[];
  is_active: boolean;
}

export default function Budgets() {
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    period: "monthly",
    amount: "",
  });

  const load = useCallback(() => {
    api<Budget[]>("/budgets").then(setBudgets).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    api<Category[]>("/categories").then(setCategories).catch(() => {});
  }, [load]);

  async function createBudget(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/budgets", {
        method: "POST",
        body: {
          name: form.name,
          category_id: form.category_id ? Number(form.category_id) : null,
          period: form.period,
          amount: Number(form.amount),
          alert_thresholds: [50, 75, 90],
        },
      });
      setForm({ name: "", category_id: "", period: "monthly", amount: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create budget");
    }
  }

  async function deleteBudget(id: number) {
    try {
      await api(`/budgets/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete budget");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Budgets</h1>
        <p className="text-sm text-slate-600">
          Set spending limits and get alerted at 50% · 75% · 90%
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      <GlassCard className="p-5">
        <SectionTitle title="Create a budget" />
        <form onSubmit={createBudget} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="b-name" className="label">Name</label>
            <input id="b-name" className="input" required placeholder="e.g. Food budget"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="b-cat" className="label">Category (optional)</label>
            <select id="b-cat" className="input" value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Overall spending</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="b-period" className="label">Period</label>
            <select id="b-period" className="input" value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label htmlFor="b-amt" className="label">Limit (₹)</label>
            <input id="b-amt" type="number" min="1" step="0.01" className="input" required
              value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">Create</button>
          </div>
        </form>
      </GlassCard>

      {budgets === null ? (
        <Spinner />
      ) : budgets.length === 0 ? (
        <GlassCard className="p-5">
          <EmptyState icon="◎" title="No budgets yet" hint="Create your first budget above to start tracking." />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((b) => {
            const over = b.utilization_pct >= 100;
            const barColor = over ? "bg-rose" : b.utilization_pct >= 75 ? "bg-amber" : "bg-mint";
            return (
              <GlassCard key={b.id} hover className="animate-fade-up p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{b.name}</p>
                    <p className="text-xs text-slate-500">
                      {b.category_name ?? "Overall"} · {b.period}
                    </p>
                  </div>
                  <button onClick={() => deleteBudget(b.id)}
                    className="text-xs text-slate-600 hover:text-rose" aria-label={`Delete ${b.name}`}>
                    ✕
                  </button>
                </div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xl font-bold text-slate-900">{money(Number(b.amount))}</span>
                  <span className={`text-sm font-semibold ${over ? "text-rose" : "text-slate-600"}`}>
                    {b.utilization_pct.toFixed(0)}% used
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-sky-100">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${Math.min(b.utilization_pct, 100)}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-600">Spent {money(b.actual)}</span>
                  <span className={b.remaining < 0 ? "font-semibold text-rose" : "text-emerald-600"}>
                    {b.remaining < 0 ? `Over by ${money(-b.remaining)}` : `${money(b.remaining)} left`}
                  </span>
                </div>
                {b.triggered_alerts.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">
                    Alert: usage crossed {b.triggered_alerts[b.triggered_alerts.length - 1]}% of this budget.
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
