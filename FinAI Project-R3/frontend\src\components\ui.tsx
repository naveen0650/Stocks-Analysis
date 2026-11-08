import type { ReactNode } from "react";

/** Ambient animated background shown app-wide. */
export function AuroraBackground() {
  return (
    <div className="aurora-bg" aria-hidden="true">
      <div
        className="aurora-blob h-96 w-96 bg-aurora-500/40"
        style={{ top: "-6rem", left: "12%" }}
      />
      <div
        className="aurora-blob h-80 w-80 bg-mint/25"
        style={{ bottom: "-4rem", right: "10%", animationDelay: "2.5s" }}
      />
      <div
        className="aurora-blob h-72 w-72 bg-aurora-300/20"
        style={{ top: "40%", left: "55%", animationDelay: "4.5s" }}
      />
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`glass ${hover ? "glass-hover" : ""} ${className}`}>{children}</div>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
    </div>
  );
}

const TONE_STYLES: Record<string, { ring: string; text: string }> = {
  neutral: { ring: "from-aurora-500/30 to-aurora-300/10", text: "text-aurora-300" },
  positive: { ring: "from-mint/30 to-mint/5", text: "text-emerald-600" },
  warning: { ring: "from-amber/30 to-amber/5", text: "text-amber" },
  danger: { ring: "from-rose/30 to-rose/5", text: "text-rose" },
};

export function MetricCard({
  label,
  value,
  delta,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  delta?: string | null;
  hint?: string;
  tone?: keyof typeof TONE_STYLES | string;
  icon?: ReactNode;
}) {
  const styles = TONE_STYLES[tone] ?? TONE_STYLES.neutral;
  return (
    <GlassCard hover className="animate-fade-up p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-600">
          {label}
        </p>
        {icon && (
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${styles.ring} text-base`}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={
              delta.startsWith("-") ? "font-medium text-rose" : "font-medium text-emerald-600"
            }
          >
            {delta}
          </span>
        )}
        {hint && <span className="text-slate-500">{hint}</span>}
      </div>
    </GlassCard>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-aurora-400/30 border-t-aurora-400" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
    >
      {message}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
