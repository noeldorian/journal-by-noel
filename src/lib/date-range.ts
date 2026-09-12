import type { DateRangeKey, Trade } from "./types";
import { toLocalDateStr } from "./utils";

export interface DateRange {
  key: DateRangeKey;
  start: string | null; // yyyy-MM-dd, inclusive
  end: string | null; // yyyy-MM-dd, inclusive
  label: string;
}

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  return date;
}

export function resolveDateRange(key: DateRangeKey, custom?: { start: string; end: string }): DateRange {
  const now = new Date();
  const todayStr = toLocalDateStr(now);

  switch (key) {
    case "today":
      return { key, start: todayStr, end: todayStr, label: "Today" };
    case "week": {
      const start = startOfWeek(now);
      return { key, start: toLocalDateStr(start), end: todayStr, label: "This Week" };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { key, start: toLocalDateStr(start), end: todayStr, label: "This Month" };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { key, start: toLocalDateStr(start), end: todayStr, label: "This Year" };
    }
    case "custom":
      return {
        key,
        start: custom?.start ?? todayStr,
        end: custom?.end ?? todayStr,
        label: custom ? `${custom.start} – ${custom.end}` : "Custom",
      };
    default:
      return { key: "month", start: toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), end: todayStr, label: "This Month" };
  }
}

export function filterTradesByRange(trades: Trade[], range: DateRange): Trade[] {
  if (!range.start || !range.end) return trades;
  return trades.filter((t) => t.date >= range.start! && t.date <= range.end!);
}

export function previousPeriodRange(range: DateRange): DateRange {
  if (!range.start || !range.end) return range;
  // Bare "yyyy-MM-dd" strings parse as UTC midnight, not local midnight —
  // appending a local time-of-day avoids an off-by-one day in either
  // direction depending on the viewer's timezone offset.
  const start = new Date(range.start + "T00:00:00");
  const end = new Date(range.end + "T00:00:00");
  const spanMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - spanMs);
  return { key: "custom", start: toLocalDateStr(prevStart), end: toLocalDateStr(prevEnd), label: "Previous period" };
}

export const DATE_RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];
