import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ErrorBanner, GlassCard, SectionTitle, Spinner } from "../components/ui";

interface Factor {
  key: string;
  label: string;
  weight: number;
  effective_weight: number | null;
  factor_score: number | null;
  contribution: number | null;
  status: "evaluated" | "not_evaluated";
  reason: string | null;
  explanation: string | null;
  suggestions: string[];
}

interface HealthData {
  score: number;
  grade: string;
  factors: Factor[];
  evaluated_count: number;
  window_days: number;
}

function scoreColor(score: number): string {
  if (score >= 85) return "#34d399";
  if (score >= 70) return "#0ea5e9";
  if (score >= 55) return "#fbbf24";
  if (score >= 40) return "#fb923c";
  return "#fb7185";
}

/** Explainable financial health score — every factor shows its math. */
export default function HealthScorePage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<HealthData>("/analytics/health-score")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner label="Scoring your financial health…" />;

  const color = scoreColor(data.score);
  const circumference = 2 * Math.PI * 54;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Health</h1>
        <p className="text-sm text-slate-600">
          A transparent score — every factor, weight and contribution is shown below
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GlassCard className="flex flex-col items-center justify-center p-8">
          <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Health score ${data.score} of 100`}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="12" />
            <circle
              cx="70" cy="70" r="54" fill="none"
              stroke={color} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - data.score / 100)}
              transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
            <text x="70" y="66" textAnchor="middle" fill="#fff" fontSize="34" fontWeight="700">
              {data.score}
            </text>
            <text x="70" y="90" textAnchor="middle" fill="#64748b" fontSize="12">
              of 100
            </text>
          </svg>
          <p className="mt-3 text-lg font-bold" style={{ color }}>
            {data.grade}
          </p>
          <p className="mt-1 text-center text-xs text-slate-500">
            {data.evaluated_count} of {data.factors.length} factors evaluated over{" "}
            {data.window_days} days
          </p>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <SectionTitle
            title="Factor breakdown"
            subtitle="Weights redistribute when a factor cannot be evaluated — nothing is invented"
          />
          <ul className="space-y-4">
            {data.factors.map((f) => (
              <li key={f.key} className="rounded-xl border border-sky-100 bg-sky-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      f.status === "evaluated" ? "" : "bg-slate-600"
                    }`}
                      style={f.status === "evaluated" ? { background: scoreColor(f.factor_score ?? 0) } : {}}
                    />
                    <span className="text-sm font-semibold text-slate-900">{f.label}</span>
                    <span className="chip !py-0 text-[10px]">
                      weight {(f.effective_weight ?? f.weight).toFixed(2)}
                    </span>
                  </div>
                  {f.status === "evaluated" ? (
                    <span className="text-sm font-bold" style={{ color: scoreColor(f.factor_score ?? 0) }}>
                      {f.factor_score?.toFixed(0)} <span className="text-xs text-slate-500">→ +{f.contribution?.toFixed(1)} pts</span>
                    </span>
                  ) : (
                    <span className="chip border-slate-200 bg-slate-100 text-slate-500">not evaluated</span>
                  )}
                </div>
                {f.status === "evaluated" && f.explanation && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{f.explanation}</p>
                )}
                {f.status === "not_evaluated" && f.reason && (
                  <p className="mt-2 text-xs italic text-slate-500">{f.reason}</p>
                )}
                {f.suggestions.length > 0 && (
                  <p className="mt-1.5 text-xs text-aurora-300">💡 {f.suggestions[0]}</p>
                )}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
