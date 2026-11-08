import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AuroraBackground, GlassCard, ErrorBanner } from "../components/ui";

interface Disclaimer {
  version: string;
  title: string;
  points: string[];
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"email" | "mobile">("email");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [version, setVersion] = useState<string>("1.0.0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Disclaimer>("/config/disclaimer")
      .then((d) => setVersion(d.version))
      .catch(() => setVersion("1.0.0"));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await register({
        email: mode === "email" ? email : undefined,
        mobile: mode === "mobile" ? mobile : undefined,
        password,
        full_name: fullName,
        disclaimer_version: version,
      });
      navigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <AuroraBackground />
      <GlassCard className="w-full max-w-md animate-fade-up p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-500 to-aurora-300 text-2xl font-black text-white shadow-glow-sm">
            ₹
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-600">
            Start your journey toward financial clarity
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span className="label">Sign up with</span>
            <div className="grid grid-cols-2 gap-2">
              {(["email", "mobile"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition ${
                    mode === m
                      ? "border-aurora-400/60 bg-aurora-500/15 text-sky-700"
                      : "border-sky-100 bg-sky-50 text-slate-600 hover:bg-sky-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fullName" className="label">Full name</label>
            <input
              id="fullName"
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              required
              maxLength={120}
            />
          </div>

          {mode === "email" ? (
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          ) : (
            <div>
              <label htmlFor="mobile" className="label">Mobile number</label>
              <input
                id="mobile"
                className="input"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                pattern="[6-9][0-9]{9}"
                title="10-digit Indian mobile number starting with 6-9"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="confirm" className="label">Confirm</label>
              <input
                id="confirm"
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 p-3.5">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-aurora-400"
              required
            />
            <span className="text-xs leading-relaxed text-slate-600">
              I accept the{" "}
              <Link to="/" className="text-aurora-300 hover:underline">
                investment risk disclaimer
              </Link>{" "}
              (v{version}) and understand this platform is educational, not investment advice.
            </span>
          </label>

          <button type="submit" className="btn-primary w-full" disabled={busy || !accepted}>
            {busy ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-aurora-300 hover:text-sky-700">
            Sign in
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
