import type { Trade } from "./types";
import { computeAggregateStats, computeTradeMetrics, type AggregateStats } from "./calculations";

export interface BreakdownGroup {
  key: string;
  count: number;
  stats: AggregateStats;
}

export function computeBreakdown(trades: Trade[], keyFn: (t: Trade) => string): BreakdownGroup[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = keyFn(t);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return Array.from(map.entries())
    .map(([key, list]) => ({ key, count: list.length, stats: computeAggregateStats(list) }))
    .sort((a, b) => b.stats.netPnl - a.stats.netPnl);
}

export const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayOfWeek(trade: Trade) {
  return DAY_NAMES[new Date(trade.date + "T00:00:00").getDay()];
}

export function hourBucket(trade: Trade) {
  const hour = Number(trade.entryTime.split(":")[0]);
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${period}`;
}

export function rMultipleBucket(rMultiple: number): string {
  if (rMultiple <= -3) return "≤ -3R";
  if (rMultiple <= -2) return "-2R to -3R";
  if (rMultiple <= -1) return "-1R to -2R";
  if (rMultiple < 0) return "0R to -1R";
  if (rMultiple === 0) return "0R";
  if (rMultiple <= 1) return "0R to 1R";
  if (rMultiple <= 2) return "1R to 2R";
  if (rMultiple <= 3) return "2R to 3R";
  return "≥ 3R";
}

export function rMultipleHistogram(trades: Trade[]) {
  const buckets = ["≤ -3R", "-2R to -3R", "-1R to -2R", "0R to -1R", "0R to 1R", "1R to 2R", "2R to 3R", "≥ 3R"];
  const counts = new Map(buckets.map((b) => [b, 0]));
  for (const t of trades) {
    const m = computeTradeMetrics(t);
    const bucket = rMultipleBucket(m.rMultiple);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return buckets.map((b) => ({ bucket: b, count: counts.get(b) ?? 0 }));
}
