import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, opts: { showSign?: boolean } = {}) {
  const { showSign = true } = opts;
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!showSign) return `$${formatted}`;
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${formatted}`;
}

export function formatCompactCurrency(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatR(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(2)}R`;
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = {}) {
  const d = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", ...opts });
}

export function formatDateShort(value: string) {
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function pnlColorClass(value: number) {
  if (value > 0) return "text-[var(--pos)]";
  if (value < 0) return "text-[var(--neg)]";
  return "text-[var(--text-secondary)]";
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// Formats a Date as yyyy-MM-dd using its LOCAL calendar day, not UTC.
// Using `date.toISOString().slice(0, 10)` instead would shift the day
// backward for anyone east of UTC (most of Europe, Africa, Asia,
// Australia) whenever it's called on a local midnight — e.g. midnight in
// Vienna (UTC+2) is still 22:00 the PREVIOUS day in UTC. Every place that
// turns a Date into the "yyyy-MM-dd" used to match Trade.date should use
// this instead.
export function toLocalDateStr(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocalDateStr() {
  return toLocalDateStr(new Date());
}
