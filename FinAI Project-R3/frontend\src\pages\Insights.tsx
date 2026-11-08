import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { dateLabel } from "../lib/format";
import { EmptyState, ErrorBanner, GlassCard, Spinner } from "../components/ui";

interface Insight {
  type: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  evidence: Record<string, unknown>;
}

interface InsightsPayload {
  generated_at: string;
  insights: Insight[];
  data_window: { from: string; to: string };
}

const SEVERITY_META: Record<string, { badge: string; border: string; label: string }> = {
  critical: { badge: "bg-rose/20 text-rose", border: "border-rose-500/40", label: "Critical" },
  warning: { badge: "bg-amber/20 text-amber", border: "border-amber/40", label: "Warning" },
  info: { badge: "bg-aurora-500/20 text-aurora-300", border: "border-aurora-400/30", label: "Insight" },
};

/** AI insight feed. Each card exposes the evidence the rule was derived from. */
export default function Insights() {
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    api<InsightsPayload>("/analytics/insights")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner label="Generating insights…" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">AI Insights</h1>
        <p className="text-sm text-slate-600">
          Generated {dateLabel(data.generated_at)} from your data between{" "}
          {dateLabel(data.data_window.from)} and {dateLabel(data.data_window.to)}
        </p>
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-xs leading-relaxed text-slate-600">
        ✦ Every insight below is produced by a guarded rule engine over your own
        records — each rule only fires when the underlying data is sufficient, and
        you can expand any card to see the exact evidence. The AI never claims
        anything your data does not support.
      </div>

      {data.insights.length === 0 ? (
        <GlassCard className="p-5">
          <EmptyState
            icon="✦"
            title="No insights yet"
            hint="Keep recording expenses — patterns (spikes, weekend habits, recurring payments, budget pressure) usually surface within a couple of months."
          />
        </GlassCard>
      ) : (
        <ul className="space-y-4">
          {data.insights.map((insight, i) => {
            const meta = SEVERITY_META[insight.severity] ?? SEVERITY_META.info;
            return (
              <li key={i}>
                <GlassCard hover className={`animate-fade-up border ${meta.border} p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-semibold text-slate-900">{insight.title}</h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{insight.message}</p>
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="mt-3 text-xs font-medium text-aurora-300 hover:text-sky-700"
                  >
                    {open === i ? "Hide evidence ▲" : "Show evidence ▼"}
                  </button>
                  {open === i && (
                    <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-sky-100 bg-ink-950/80 p-3 text-[11px] leading-relaxed text-slate-600 slim-scroll">
                      {JSON.stringify(insight.evidence, null, 2)}
                    </pre>
                  )}
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
