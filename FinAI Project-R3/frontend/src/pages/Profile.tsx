import { useEffect, useState, type FormEvent } from "react";
import { api } from "../lib/api";
import { dateLabel } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner, GlassCard, SectionTitle, Spinner } from "../components/ui";

interface Session {
  id: number;
  user_agent: string;
  ip_address: string;
  created_at: string;
  last_used_at: string | null;
  is_current: boolean;
}

export default function Profile() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Session[]>("/auth/sessions").then(setSessions).catch(() => setSessions([]));
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await api("/auth/me", { method: "PATCH", body: { full_name: fullName } });
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { current_password: currentPassword, new_password: newPassword },
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password changed. Other sessions remain active until they expire.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    }
  }

  async function revoke(id: number) {
    try {
      await api(`/auth/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke session");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile & Security</h1>
        <p className="text-sm text-slate-600">Manage your account</p>
      </div>

      {message && (
        <div className="rounded-xl border border-mint/30 bg-mint/10 px-4 py-3 text-sm text-emerald-600">
          {message}
        </div>
      )}
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          <SectionTitle title="Account" />
          <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="text-slate-700">{user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Mobile</dt>
              <dd className="text-slate-700">{user?.mobile ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Role</dt>
              <dd className="capitalize text-slate-700">{user?.role}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Status</dt>
              <dd className="text-emerald-600">Active</dd>
            </div>
          </dl>
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label htmlFor="p-name" className="label">Full name</label>
              <input id="p-name" className="input" value={fullName}
                onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary">Save profile</button>
          </form>
        </GlassCard>

        <GlassCard className="p-5">
          <SectionTitle title="Change password" subtitle="Minimum 8 characters" />
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <label htmlFor="p-cur" className="label">Current password</label>
              <input id="p-cur" type="password" className="input" required autoComplete="current-password"
                value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label htmlFor="p-new" className="label">New password</label>
              <input id="p-new" type="password" className="input" required minLength={8} autoComplete="new-password"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">Update password</button>
          </form>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <SectionTitle
          title="Active sessions"
          subtitle="Devices with a valid refresh session — revoke anything you don't recognise"
        />
        {sessions === null ? (
          <Spinner label="Loading sessions…" />
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-700">
                    {s.user_agent || "Unknown device"}
                    {s.is_current && (
                      <span className="chip border-mint/40 text-emerald-600 ml-2">this device</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.ip_address || "unknown IP"} · started {dateLabel(s.created_at)}
                  </p>
                </div>
                {!s.is_current && (
                  <button onClick={() => revoke(s.id)} className="btn-danger !px-3 !py-1.5 text-xs">
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
