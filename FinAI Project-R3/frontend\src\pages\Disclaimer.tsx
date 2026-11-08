import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AuroraBackground, GlassCard, ErrorBanner } from "../components/ui";

interface Disclaimer {
  version: string;
  title: string;
  points: string[];
  acknowledgement: string;
}

/** Pre-usage investment-risk agreement. Acceptance is stored server-side
 *  (version + timestamp + IP) when the account is created / login occurs. */
export default function Disclaimer({ onAccepted }: { onAccepted: () => void }) {
  const [disclaimer, setDisclaimer] = useState<Disclaimer | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Disclaimer>("/config/disclaimer")
      .then(setDisclaimer)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <AuroraBackground />
      <GlassCard className="w-full max-w-2xl animate-fade-up p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber/40 to-amber/10 text-xl">
            ⚠️
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {disclaimer?.title ?? "Investment Risk Disclaimer"}
            </h1>
            <p className="text-xs text-slate-500">Version {disclaimer?.version ?? "…"}</p>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {disclaimer && (
          <>
            <ul className="mb-6 space-y-2.5">
              {disclaimer.points.map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora-400" />
                  {point}
                </li>
              ))}
            </ul>

            <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-aurora-400"
              />
              <span className="text-sm text-slate-600">
                I have read and understood this disclaimer in full. I accept it
                voluntarily and on my own behalf.
              </span>
            </label>

            <button
              className="btn-primary w-full"
              disabled={!acknowledged}
              onClick={onAccepted}
            >
              {disclaimer.acknowledgement}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Your acceptance (version {disclaimer.version}) is recorded when you create
              your account.
            </p>
          </>
        )}
      </GlassCard>
    </div>
  );
}
