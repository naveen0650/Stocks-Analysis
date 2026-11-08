/** Formatting helpers shared across pages. */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function money(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return inr.format(Number(value));
}

export function moneyCompact(value: number): string {
  return inrCompact.format(value);
}

export function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", year: "numeric" }
  );
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
