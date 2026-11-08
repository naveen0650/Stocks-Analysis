import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { dateLabel } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { EmptyState, ErrorBanner, GlassCard, MetricCard, SectionTitle, Spinner } from "../components/ui";

interface Overview {
  users: { total: number; active: number; new_this_week: number; dau: number; mau: number };
  activity_24h: { successful_logins: number; failed_logins: number; suspicious: boolean };
  feature_usage: Record<string, number>;
  system: { database: string; disclaimer_version: string };
}

interface AdminUser {
  id: number;
  email: string | null;
  mobile: string | null;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  expense_count: number;
}

interface AuditRow {
  id: number;
  user_id: number | null;
  action: string;
  ip_address: string;
  created_at: string;
}

const TABS = ["Overview", "Users", "Audit & Security"] as const;

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<AuditRow[] | null>(null);
  const [activity, setActivity] = useState<{ series: { date: string; success: number; failed: number }[] } | null>(null);
  const [error, setError] = useState("");

  const loadAll = useCallback(() => {
    api<Overview>("/admin/overview").then(setOverview).catch((e) => setError(e.message));
    api<{ items: AdminUser[] }>("/admin/users").then((d) => setUsers(d.items)).catch(() => {});
    api<{ items: AuditRow[] }>("/admin/audit-logs?limit=50").then((d) => setLogs(d.items)).catch(() => {});
    api<{ series: { date: string; success: number; failed: number }[] }>("/admin/login-activity")
      .then(setActivity).catch(() => {});
  }, []);

  useEffect(loadAll, [loadAll]);

  async function searchUsers(term: string) {
    setSearch(term);
    const q = term ? `?search=${encodeURIComponent(term)}` : "";
    const d = await api<{ items: AdminUser[] }>(`/admin/users${q}`).catch(() => null);
    if (d) setUsers(d.items);
  }

  async function patchUser(id: number, body: Record<string, unknown>) {
    setError("");
    try {
      await api(`/admin/users/${id}`, { method: "PATCH", body });
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ErrorBanner message="Administrator access required." />
      </div>
    );
  }

  if (!overview) return <Spinner label="Loading admin console…" />;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Console</h1>
            <p className="text-sm text-slate-600">
              Operational metrics only — user financial data is never exposed here
            </p>
          </div>
          <Link to="/app" className="btn-ghost text-xs">← Back to app</Link>
        </div>

        {error && <ErrorBanner message={error} />}

        <nav className="flex gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                tab === t
                  ? "border-rose-400/40 bg-rose-500/10 text-slate-900"
                  : "border-sky-100 bg-sky-50 text-slate-600 hover:bg-sky-100"
              }`}>
              {t}
            </button>
          ))}
        </nav>

        {tab === "Overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <MetricCard label="Total users" value={String(overview.users.total)} icon="👥" />
              <MetricCard label="Active accounts" value={String(overview.users.active)} icon="✓" tone="positive" />
              <MetricCard label="New this week" value={String(overview.users.new_this_week)} icon="＋" tone="neutral" />
              <MetricCard
                label="Failed logins (24h)"
                value={String(overview.activity_24h.failed_logins)}
                icon="⚑"
                tone={overview.activity_24h.suspicious ? "danger" : "positive"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <MetricCard label="DAU" value={String(overview.users.dau)} hint="sessions active in 24h" />
              <MetricCard label="MAU" value={String(overview.users.mau)} hint="sessions active in 30d" />
              <MetricCard label="Successful logins (24h)" value={String(overview.activity_24h.successful_logins)} tone="positive" />
              <MetricCard label="Database" value={overview.system.database.toUpperCase()} hint={`disclaimer v${overview.system.disclaimer_version}`} tone="positive" />
            </div>
            <GlassCard className="p-5">
              <SectionTitle title="Feature usage" subtitle="Cumulative counts" />
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Object.entries(overview.feature_usage).map(([k, v]) => (
                  <li key={k} className="rounded-xl border border-sky-100 bg-sky-50/70 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {k.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{v}</p>
                  </li>
                ))}
              </ul>
            </GlassCard>
            {overview.activity_24h.suspicious && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                ⚠ Elevated failed-login activity in the last 24 hours — review the audit trail.
              </div>
            )}
          </div>
        )}

        {tab === "Users" && (
          <GlassCard className="overflow-hidden">
            <div className="border-b border-sky-100 p-4">
              <input className="input max-w-sm" placeholder="Search by email, mobile, name…"
                value={search} onChange={(e) => searchUsers(e.target.value)} />
            </div>
            {users === null ? (
              <Spinner />
            ) : users.length === 0 ? (
              <EmptyState icon="👥" title="No users match" />
            ) : (
              <div className="overflow-x-auto slim-scroll">
                <table className="w-full text-sm">
                  <thead className="bg-sky-50/70">
                    <tr>
                      <th className="table-head px-4 py-3">User</th>
                      <th className="table-head px-4 py-3">Role</th>
                      <th className="table-head px-4 py-3">Status</th>
                      <th className="table-head px-4 py-3">Joined</th>
                      <th className="table-head px-4 py-3">Last login</th>
                      <th className="table-head px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-sky-100">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-700">{u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.email ?? u.mobile}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`chip ${u.role === "admin" ? "border-rose-400/40 text-rose-600" : ""}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`chip ${u.is_active ? "border-mint/40 text-emerald-600" : "border-rose-400/40 text-rose-600"}`}>
                            {u.is_active ? "active" : "disabled"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{dateLabel(u.created_at)}</td>
                        <td className="px-4 py-3 text-slate-600">{dateLabel(u.last_login_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              className="btn-ghost !px-2.5 !py-1 text-xs"
                              onClick={() => patchUser(u.id, { is_active: !u.is_active })}
                            >
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              className="btn-ghost !px-2.5 !py-1 text-xs"
                              onClick={() => patchUser(u.id, { role: u.role === "admin" ? "user" : "admin" })}
                            >
                              {u.role === "admin" ? "Demote" : "Make admin"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        {tab === "Audit & Security" && (
          <div className="space-y-6">
            <GlassCard className="p-5">
              <SectionTitle title="Login activity" subtitle="Successes vs failures, last 14 days" />
              {activity && activity.series.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={activity.series}>
                    <CartesianGrid stroke="rgba(148,163,184,0.1)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#ffffff", border: "1px solid #bae6fd",
                        borderRadius: 12, color: "#0f172a",
                      }}
                    />
                    <Bar dataKey="success" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} name="Success" />
                    <Bar dataKey="failed" stackId="a" fill="#fb7185" radius={[6, 6, 0, 0]} name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon="📅" title="No login activity yet" />
              )}
            </GlassCard>

            <GlassCard className="overflow-hidden">
              <div className="border-b border-sky-100 p-4">
                <SectionTitle title="Audit trail" subtitle="Most recent 50 security-relevant events" />
              </div>
              {logs === null ? (
                <Spinner />
              ) : logs.length === 0 ? (
                <EmptyState icon="📜" title="No audit events yet" />
              ) : (
                <div className="overflow-x-auto slim-scroll">
                  <table className="w-full text-sm">
                    <thead className="bg-sky-50/70">
                      <tr>
                        <th className="table-head px-4 py-3">Time</th>
                        <th className="table-head px-4 py-3">Action</th>
                        <th className="table-head px-4 py-3">User</th>
                        <th className="table-head px-4 py-3">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l) => (
                        <tr key={l.id} className="border-t border-sky-100">
                          <td className="px-4 py-2.5 text-slate-500">{new Date(l.created_at + "Z").toLocaleString("en-IN")}</td>
                          <td className="px-4 py-2.5">
                            <span className="chip">{l.action}</span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{l.user_id ?? "—"}</td>
                          <td className="px-4 py-2.5 text-slate-500">{l.ip_address}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}
