import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { dateLabel, money, todayISO } from "../lib/format";
import { EmptyState, ErrorBanner, GlassCard, SectionTitle, Spinner } from "../components/ui";

interface Category {
  id: number;
  name: string;
  is_system: boolean;
}

interface Expense {
  id: number;
  category_id: number;
  category_name: string;
  expense_date: string;
  amount: string;
  subcategory: string | null;
  payment_method: string;
  merchant: string | null;
  notes: string | null;
  is_recurring: boolean;
  tags: string[];
}

const PAYMENT_METHODS = [
  ["upi", "UPI"],
  ["cash", "Cash"],
  ["debit_card", "Debit card"],
  ["credit_card", "Credit card"],
  ["net_banking", "Net banking"],
  ["wallet", "Wallet"],
  ["other", "Other"],
] as const;

export default function Expenses() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ from: "", to: "", categoryId: "", q: "" });
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [form, setForm] = useState({
    category_id: "",
    expense_date: todayISO(),
    amount: "",
    payment_method: "upi",
    merchant: "",
    notes: "",
    is_recurring: false,
    tags: "",
  });

  const pageSize = 15;

  const loadCategories = useCallback(() => {
    api<Category[]>("/categories")
      .then(setCategories)
      .catch((e) => setError(e.message));
  }, []);

  const loadExpenses = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (filters.from) params.set("date_from", filters.from);
    if (filters.to) params.set("date_to", filters.to);
    if (filters.categoryId) params.set("category_id", filters.categoryId);
    if (filters.q) params.set("q", filters.q);
    api<{ items: Expense[]; total: number }>(`/expenses?${params}`)
      .then((d) => {
        setExpenses(d.items);
        setTotal(d.total);
      })
      .catch((e) => setError(e.message));
  }, [page, filters]);

  useEffect(loadCategories, [loadCategories]);
  useEffect(loadExpenses, [loadExpenses]);

  async function createExpense(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/expenses", {
        method: "POST",
        body: {
          category_id: Number(form.category_id),
          expense_date: form.expense_date,
          amount: Number(form.amount),
          payment_method: form.payment_method,
          merchant: form.merchant || null,
          notes: form.notes || null,
          is_recurring: form.is_recurring,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        },
      });
      setShowForm(false);
      setForm({ ...form, amount: "", merchant: "", notes: "", tags: "" });
      loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save expense");
    }
  }

  async function deleteExpense(id: number) {
    try {
      await api(`/expenses/${id}`, { method: "DELETE" });
      loadExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    try {
      await api("/categories", { method: "POST", body: { name: newCategoryName.trim() } });
      setNewCategoryName("");
      loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expense Manager</h1>
          <p className="text-sm text-slate-600">Record and organise everything you spend</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Close" : "+ Add expense"}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {showForm && (
        <GlassCard className="animate-fade-up p-5">
          <SectionTitle title="New expense" />
          <form onSubmit={createExpense} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="exp-cat" className="label">Category</label>
              <select
                id="exp-cat"
                className="input"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exp-date" className="label">Date</label>
              <input
                id="exp-date" type="date" className="input" required
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="exp-amt" className="label">Amount (₹)</label>
              <input
                id="exp-amt" type="number" min="0.01" step="0.01" className="input" required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="exp-pay" className="label">Paid via</label>
              <select
                id="exp-pay" className="input"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                {PAYMENT_METHODS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="exp-mer" className="label">Merchant</label>
              <input
                id="exp-mer" className="input" placeholder="e.g. BigBasket"
                value={form.merchant}
                onChange={(e) => setForm({ ...form, merchant: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="exp-tags" className="label">Tags (comma-separated)</label>
              <input
                id="exp-tags" className="input" placeholder="work, team-lunch"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="exp-notes" className="label">Notes</label>
              <input
                id="exp-notes" className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-aurora-400"
                checked={form.is_recurring}
                onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
              />
              Recurring expense
            </label>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">Save expense</button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-sky-100 pt-4">
            <span className="text-xs text-slate-500">Custom categories:</span>
            {categories.filter((c) => !c.is_system).map((c) => (
              <button
                key={c.id}
                onClick={() => api(`/categories/${c.id}`, { method: "DELETE" }).then(loadCategories).catch(() => {})}
                className="chip hover:border-rose-400/40 hover:text-rose-600"
                title="Click to delete (only works if unused)"
              >
                {c.name} ×
              </button>
            ))}
            <input
              className="input !w-40 !py-1.5 text-xs"
              placeholder="New category…"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={addCategory}>
              Add
            </button>
          </div>
        </GlassCard>
      )}

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div>
            <label htmlFor="f-from" className="label">From</label>
            <input id="f-from" type="date" className="input"
              value={filters.from}
              onChange={(e) => { setPage(1); setFilters({ ...filters, from: e.target.value }); }}
            />
          </div>
          <div>
            <label htmlFor="f-to" className="label">To</label>
            <input id="f-to" type="date" className="input"
              value={filters.to}
              onChange={(e) => { setPage(1); setFilters({ ...filters, to: e.target.value }); }}
            />
          </div>
          <div>
            <label htmlFor="f-cat" className="label">Category</label>
            <select id="f-cat" className="input"
              value={filters.categoryId}
              onChange={(e) => { setPage(1); setFilters({ ...filters, categoryId: e.target.value }); }}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="f-q" className="label">Search</label>
            <input id="f-q" className="input" placeholder="Merchant, notes, subcategory…"
              value={filters.q}
              onChange={(e) => { setPage(1); setFilters({ ...filters, q: e.target.value }); }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        {expenses === null ? (
          <Spinner />
        ) : expenses.length === 0 ? (
          <EmptyState icon="🧾" title="No expenses found" hint="Adjust the filters or add your first expense." />
        ) : (
          <div className="overflow-x-auto slim-scroll">
            <table className="w-full text-sm">
              <thead className="bg-sky-50/70">
                <tr>
                  <th className="table-head px-4 py-3">Date</th>
                  <th className="table-head px-4 py-3">Category</th>
                  <th className="table-head px-4 py-3">Merchant</th>
                  <th className="table-head px-4 py-3">Method</th>
                  <th className="table-head px-4 py-3">Tags</th>
                  <th className="table-head px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-sky-100 transition hover:bg-sky-50/70">
                    <td className="px-4 py-3 text-slate-600">{dateLabel(e.expense_date)}</td>
                    <td className="px-4 py-3">
                      <span className="chip">{e.category_name}</span>
                      {e.is_recurring && <span className="chip ml-1.5 border-mint/30 text-emerald-600">recurring</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.merchant ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{e.payment_method.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {e.tags.map((t) => (
                          <span key={t} className="chip !px-2 !py-0 text-[10px]">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{money(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="text-xs text-slate-500 transition hover:text-rose"
                        aria-label={`Delete expense from ${e.merchant ?? "unknown"}`}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {expenses !== null && expenses.length > 0 && (
          <div className="flex items-center justify-between border-t border-sky-100 px-4 py-3 text-xs text-slate-500">
            <span>{total} transactions</span>
            <div className="flex items-center gap-2">
              <button className="btn-ghost !px-2.5 !py-1 text-xs" disabled={page <= 1}
                onClick={() => setPage(page - 1)}>← Prev</button>
              <span>Page {page} / {totalPages}</span>
              <button className="btn-ghost !px-2.5 !py-1 text-xs" disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
