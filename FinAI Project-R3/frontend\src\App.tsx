import { useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Disclaimer from "./pages/Disclaimer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import Budgets from "./pages/Budgets";
import Analytics from "./pages/Analytics";
import HealthScore from "./pages/HealthScore";
import Insights from "./pages/Insights";
import Market from "./pages/Market";
import Calculators from "./pages/Calculators";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import { Spinner, AuroraBackground } from "./components/ui";

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", end: true, icon: "◈" },
  { to: "/app/expenses", label: "Expenses", icon: "₹" },
  { to: "/app/budgets", label: "Budgets", icon: "◎" },
  { to: "/app/analytics", label: "Analytics", icon: "◫" },
  { to: "/app/health", label: "Financial Health", icon: "♥" },
  { to: "/app/insights", label: "AI Insights", icon: "✦" },
  { to: "/app/calculators", label: "Calculators", icon: "🧮" },
  { to: "/app/market", label: "Market", icon: "⌖" },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-300 text-lg font-black text-white shadow-glow-sm">
        ₹
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tracking-tight text-slate-900">FinAI</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-500">
          Financial Intelligence
        </p>
      </div>
    </div>
  );
}

function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen">
      <AuroraBackground />
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-ink-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Brand />
          <div className="flex items-center gap-3">
            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                className="chip hover:border-rose-400/40 hover:text-rose-600"
              >
                Admin Panel
              </NavLink>
            )}
            <NavLink to="/app/profile" className="chip hover:border-aurora-400/40">
              {user?.full_name || "Profile"}
            </NavLink>
            <button onClick={handleLogout} className="btn-ghost !px-3 !py-1.5 text-xs">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "border border-aurora-400/30 bg-aurora-500/15 text-slate-900 shadow-glow-sm"
                      : "border border-transparent text-slate-600 hover:bg-sky-50 hover:text-slate-700"
                  }`
                }
              >
                <span aria-hidden className="text-center text-base leading-none opacity-80">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
            <p className="px-3.5 pt-4 text-[10px] leading-relaxed text-slate-500">
              Revision 3 · NIFTY 50 Market-Adjusted Fair Value, Technical Confluence,
              News Buzz Sentiment, and Financial Planning Calculators are active.
            </p>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {/* Mobile nav */}
          <nav className="mb-4 flex gap-2 overflow-x-auto pb-1 md:hidden slim-scroll">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium ${
                    isActive
                      ? "border-aurora-400/40 bg-aurora-500/15 text-slate-900"
                      : "border-sky-100 bg-sky-50 text-slate-600"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-sky-100 py-6 text-center text-xs text-slate-600">
        FinAI · Educational analytics platform — not investment advice. Data shown is
        your own recorded data.
      </footer>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Preparing your dashboard…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DisclaimerGate() {
  const { user, loading } = useAuth();
  const [accepted, setAccepted] = useState(
    () => sessionStorage.getItem("finai.disclaimer") === "1"
  );
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (accepted) return <Navigate to={user ? "/app" : "/register"} replace />;
  return (
    <Disclaimer
      onAccepted={() => {
        sessionStorage.setItem("finai.disclaimer", "1");
        setAccepted(true);
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<DisclaimerGate />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="health" element={<HealthScore />} />
          <Route path="insights" element={<Insights />} />
          <Route path="calculators" element={<Calculators />} />
          <Route path="market" element={<Market />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route
          path="/admin"
          element={
            <Protected>
              <Admin />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
