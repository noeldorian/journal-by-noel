import type { Trade } from "./types";
import { computeTradeMetrics } from "./calculations";
import { toLocalDateStr } from "./utils";

export interface EquityPoint {
  date: string;
  label: string;
  netPnl: number;
  cumulativePnl: number;
  balance: number;
  cumulativeR: number;
  drawdown: number;
}

function bucketKey(date: string, granularity: "daily" | "weekly" | "monthly") {
  if (granularity === "daily") return date;
  const d = new Date(date + "T00:00:00");
  if (granularity === "monthly") return date.slice(0, 7);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateStr(d);
}

export function buildEquitySeries(
  trades: Trade[],
  startingBalance: number,
  granularity: "daily" | "weekly" | "monthly" = "daily"
): EquityPoint[] {
  const sorted = [...trades].sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime));
  const buckets = new Map<string, { netPnl: number; r: number }>();

  for (const t of sorted) {
    const m = computeTradeMetrics(t);
    const key = bucketKey(t.date, granularity);
    const existing = buckets.get(key) ?? { netPnl: 0, r: 0 };
    existing.netPnl += m.netPnl;
    existing.r += m.rMultiple;
    buckets.set(key, existing);
  }

  const keys = Array.from(buckets.keys()).sort();
  let cumulativePnl = 0;
  let cumulativeR = 0;
  let balance = startingBalance;
  let peak = startingBalance;

  const points: EquityPoint[] = [
    { date: "start", label: "Start", netPnl: 0, cumulativePnl: 0, balance: startingBalance, cumulativeR: 0, drawdown: 0 },
  ];

  for (const key of keys) {
    const bucket = buckets.get(key)!;
    cumulativePnl += bucket.netPnl;
    cumulativeR += bucket.r;
    balance += bucket.netPnl;
    peak = Math.max(peak, balance);
    const drawdown = balance - peak;
    points.push({
      date: key,
      label: formatBucketLabel(key, granularity),
      netPnl: bucket.netPnl,
      cumulativePnl,
      balance,
      cumulativeR,
      drawdown,
    });
  }

  return points;
}

function formatBucketLabel(key: string, granularity: "daily" | "weekly" | "monthly") {
  if (granularity === "monthly") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
