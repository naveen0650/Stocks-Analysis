import { money, pct } from "../lib/format";
import { GlassCard, SectionTitle } from "./ui";

export interface NewsArticle {
  published: string;
  source: string;
  headline: string;
  score: number;
  label: "positive" | "negative" | "neutral";
  matched: string[];
  age_days: number;
}

export interface NewsBuzz {
  status: string;
  article_count: number;
  articles_last_7d?: number;
  sentiment_score: number | null;
  sentiment_label?: string;
  buzz_level: string;
  positive_count?: number;
  negative_count?: number;
  neutral_count?: number;
  articles: NewsArticle[];
}

export interface FairValue {
  current_price: number;
  fair_value: number;
  corridor: { low: number; high: number; half_width_pct: number };
  upside_pct: number;
  verdict: string;
  components: {
    intrinsic_anchor: number;
    technical_adjustment_pct: number;
    sentiment_adjustment_pct: number;
  };
  technical: { score: number; signals: { signal: string; value: number; reading: string }[] };
  method: string;
}

const LABEL_TONE: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negative: "bg-rose-50 text-rose-700 border-rose-200",
  neutral: "bg-slate-50 text-slate-600 border-slate-200",
};

function verdictTone(v: string): string {
  if (v.startsWith("Undervalued")) return "from-emerald-500 to-teal-600";
  if (v.startsWith("Overvalued")) return "from-rose-500 to-orange-500";
  return "from-sky-500 to-indigo-600";
}

const SIGNAL_NAMES: Record<string, string> = {
  trend: "Trend (SMA 20/50)",
  rsi_momentum: "RSI(14) Momentum",
  macd: "MACD Histogram",
  bollinger_position: "Bollinger Position",
};

/** R3 · market-adjusted fair value: fundamentals + technicals + news buzz. */
export default function FairValuePanel({ fv, news }: { fv: FairValue; news: NewsBuzz }) {
  // Dynamic range that always includes current_price, fair_value, and corridor bounds
  const minVal = Math.min(fv.current_price, fv.corridor.low, fv.fair_value);
  const maxVal = Math.max(fv.current_price, fv.corridor.high, fv.fair_value);
  const pad = Math.max((maxVal - minVal) * 0.18, fv.fair_value * 0.08);
  const lo = Math.max(0, minVal - pad);
  const hi = maxVal + pad;
  const pctPos = (v: number) => Math.min(98, Math.max(2, ((v - lo) / (hi - lo || 1)) * 100));

  const leftCorridor = pctPos(fv.corridor.low);
  const rightCorridor = pctPos(fv.corridor.high);
  const pricePos = pctPos(fv.current_price);
  const fairPos = pctPos(fv.fair_value);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <GlassCard className="p-6 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            title="Market-Adjusted Fair Value"
            subtitle="Blended intrinsic fundamentals tilted by technical confluence & news buzz"
          />
          <span
            className={`rounded-full bg-gradient-to-r ${verdictTone(
              fv.verdict
            )} px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm`}
          >
            {fv.verdict}
          </span>
        </div>

        {/* Key numbers */}
        <div className="mt-2 grid grid-cols-1 gap-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Fair Value Estimate
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-indigo-600">
              {money(fv.fair_value)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Corridor: {money(fv.corridor.low)} – {money(fv.corridor.high)} (±{fv.corridor.half_width_pct}%)
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Current Market Price
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">
              {money(fv.current_price)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Recorded closing quote</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Implied Upside / Downside
            </p>
            <p
              className={`mt-1 text-3xl font-extrabold tracking-tight ${
                fv.upside_pct >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {pct(fv.upside_pct)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {fv.upside_pct >= 0 ? "Trading below fair value" : "Trading above fair value"}
            </p>
          </div>
        </div>

        {/* Interactive Price-vs-Corridor Gauge */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-600">
            <span className="text-emerald-700">Undervalued Zone</span>
            <span className="text-sky-700">
              Fair Corridor ({money(fv.corridor.low)} – {money(fv.corridor.high)})
            </span>
            <span className="text-rose-700">Overvalued Zone</span>
          </div>
          <div className="relative h-4 w-full rounded-full bg-gradient-to-r from-emerald-100 via-sky-100 to-rose-100 shadow-inner">
            {/* Corridor band */}
            <div
              className="absolute top-0 h-4 rounded-full border-2 border-sky-500 bg-sky-400/25"
              style={{
                left: `${leftCorridor}%`,
                width: `${Math.max(2, rightCorridor - leftCorridor)}%`,
              }}
              title={`Fair corridor: ${money(fv.corridor.low)} – ${money(fv.corridor.high)}`}
            />
            {/* Fair value pin */}
            <div
              className="absolute -top-1.5 h-7 w-1.5 -translate-x-1/2 rounded-full bg-indigo-600 shadow"
              style={{ left: `${fairPos}%` }}
              title={`Fair Value: ${money(fv.fair_value)}`}
            />
            {/* Current price pin */}
            <div
              className="absolute -top-1.5 h-7 w-1.5 -translate-x-1/2 rounded-full bg-slate-900 shadow"
              style={{ left: `${pricePos}%` }}
              title={`Current Price: ${money(fv.current_price)}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>{money(lo)}</span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-medium text-indigo-700">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> Fair Value ({money(fv.fair_value)})
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-900">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900" /> Market Price ({money(fv.current_price)})
              </span>
            </div>
            <span>{money(hi)}</span>
          </div>
        </div>

        {/* 3-Step Valuation Waterfall */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-sky-100 bg-white p-3.5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              1. Intrinsic Anchor
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {money(fv.components.intrinsic_anchor)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Blended DCF · P/E · EV/EBITDA · DDM · PEG
            </div>
          </div>

          <div className="rounded-xl border border-sky-100 bg-white p-3.5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              2. Technical Tilt (cap ±8%)
            </div>
            <div
              className={`mt-1 text-lg font-bold ${
                fv.components.technical_adjustment_pct >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {pct(fv.components.technical_adjustment_pct)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Confluence score: {fv.technical.score >= 0 ? "+" : ""}
              {fv.technical.score.toFixed(2)}
            </div>
          </div>

          <div className="rounded-xl border border-sky-100 bg-white p-3.5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              3. News Buzz Tilt (cap ±6%)
            </div>
            <div
              className={`mt-1 text-lg font-bold ${
                fv.components.sentiment_adjustment_pct >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {pct(fv.components.sentiment_adjustment_pct)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              Buzz intensity: <span className="font-semibold capitalize">{news.buzz_level}</span>
            </div>
          </div>
        </div>

        {/* Technical Confluence Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {fv.technical.signals.map((s) => (
            <span
              key={s.signal}
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-xs text-slate-700"
            >
              <span className="text-slate-500">{SIGNAL_NAMES[s.signal] ?? s.signal}:</span>
              <strong className="font-semibold text-slate-900">{s.reading}</strong>
              <span
                className={`font-semibold ${
                  s.value >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ({s.value >= 0 ? "+" : ""}
                {s.value.toFixed(2)})
              </span>
            </span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">{fv.method}</p>
      </GlassCard>

      {/* News Buzz & Sentiment Panel */}
      <GlassCard className="flex flex-col p-6">
        <SectionTitle
          title="News Buzz & Sentiment"
          subtitle={`${news.article_count} articles analyzed · ${news.articles_last_7d ?? 0} in last 7d`}
        />
        {news.status !== "evaluated" ? (
          <p className="text-sm text-slate-500">No news available — sentiment not evaluated.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/50 p-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`text-2xl font-extrabold ${
                    (news.sentiment_score ?? 0) >= 0.15
                      ? "text-emerald-600"
                      : (news.sentiment_score ?? 0) <= -0.15
                        ? "text-rose-600"
                        : "text-slate-700"
                  }`}
                >
                  {(news.sentiment_score ?? 0) >= 0 ? "+" : ""}
                  {news.sentiment_score?.toFixed(2)}
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    LABEL_TONE[news.sentiment_label ?? "neutral"]
                  }`}
                >
                  {news.sentiment_label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="text-emerald-600">▲ {news.positive_count}</span>
                <span className="text-rose-600">▼ {news.negative_count}</span>
                <span className="text-slate-500">• {news.neutral_count}</span>
              </div>
            </div>

            <ul className="max-h-96 flex-1 space-y-2.5 overflow-y-auto pr-1 slim-scroll">
              {news.articles.map((a, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition hover:border-sky-200"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-medium">{a.published}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        LABEL_TONE[a.label]
                      }`}
                    >
                      {a.score >= 0 ? "+" : ""}
                      {a.score.toFixed(2)} · {a.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-snug text-slate-800">
                    {a.headline}
                  </p>
                  {a.matched.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {a.matched.map((term, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </GlassCard>
    </div>
  );
}
