import type { Account, Trade } from "./types";
import { computeTradeMetrics } from "./calculations";
import { todayLocalDateStr } from "./utils";

export type PropFirmStatus = "safe" | "warning" | "critical";

export interface PropFirmSnapshot {
  progressToTarget: number; // 0-100+
  amountToTarget: number;
  drawdownUsed: number;
  drawdownRemaining: number;
  drawdownPct: number;
  dailyLossUsed: number;
  dailyLossRemaining: number;
  dailyLossPct: number;
  status: PropFirmStatus;
}

export function computePropFirmSnapshot(account: Account, trades: Trade[]): PropFirmSnapshot {
  const netSinceStart = trades.reduce((s, t) => s + computeTradeMetrics(t).netPnl, 0);
  const progressToTarget = account.profitTarget > 0 ? (netSinceStart / account.profitTarget) * 100 : 0;
  const amountToTarget = Math.max(0, account.profitTarget - netSinceStart);

  let equity = account.startingBalance;
  let peak = account.startingBalance;
  for (const t of [...trades].sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime))) {
    equity += computeTradeMetrics(t).netPnl;
    peak = Math.max(peak, equity);
  }
  const drawdownUsed = Math.max(0, peak - equity);
  const drawdownRemaining = Math.max(0, account.maxDrawdown - drawdownUsed);
  const drawdownPct = account.maxDrawdown > 0 ? (drawdownUsed / account.maxDrawdown) * 100 : 0;

  const todayTrades = trades.filter((t) => t.date === todayLocalDateStr());
  const todayNet = todayTrades.reduce((s, t) => s + computeTradeMetrics(t).netPnl, 0);
  const dailyLossUsed = Math.max(0, -todayNet);
  const dailyLossRemaining = Math.max(0, account.dailyLossLimit - dailyLossUsed);
  const dailyLossPct = account.dailyLossLimit > 0 ? (dailyLossUsed / account.dailyLossLimit) * 100 : 0;

  let status: PropFirmStatus = "safe";
  if (drawdownPct >= 80 || dailyLossPct >= 80) status = "critical";
  else if (drawdownPct >= 50 || dailyLossPct >= 50) status = "warning";

  return { progressToTarget, amountToTarget, drawdownUsed, drawdownRemaining, drawdownPct, dailyLossUsed, dailyLossRemaining, dailyLossPct, status };
}
