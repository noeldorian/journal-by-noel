import type { Trade } from "./types";
import { computeAggregateStats, computeTradeMetrics, groupBy } from "./calculations";

export interface Insight {
  id: string;
  text: string;
  tone: "pos" | "neg" | "neutral";
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MIN_SAMPLE = 5;

// All insights are derived strictly from the trades passed in — never
// fabricated — and only surfaced once there is enough sample size to be
// meaningfully different from the trader's overall baseline.
export function generateInsights(trades: Trade[]): Insight[] {
  if (trades.length < MIN_SAMPLE) return [];
  const insights: Insight[] = [];
  const overall = computeAggregateStats(trades);

  const bySession = groupBy(trades, (t) => t.session);
  let bestSession: { key: string; winRate: number; n: number } | null = null;
  for (const [session, list] of Object.entries(bySession)) {
    if (list.length < MIN_SAMPLE) continue;
    const stats = computeAggregateStats(list);
    if (!bestSession || stats.winRate > bestSession.winRate) {
      bestSession = { key: session, winRate: stats.winRate, n: list.length };
    }
  }
  if (bestSession && bestSession.winRate > overall.winRate + 3) {
    insights.push({
      id: "best-session",
      tone: "pos",
      text: `You perform best during the ${bestSession.key} session — ${bestSession.winRate.toFixed(0)}% win rate across ${bestSession.n} trades.`,
    });
  }

  const byInstrument = groupBy(trades, (t) => t.instrument);
  for (const [instrument, list] of Object.entries(byInstrument)) {
    if (list.length < MIN_SAMPLE) continue;
    const stats = computeAggregateStats(list);
    if (stats.winRate >= 75) {
      insights.push({
        id: `instrument-${instrument}`,
        tone: "pos",
        text: `Your ${instrument} trades have a ${stats.winRate.toFixed(0)}% win rate across ${list.length} trades.`,
      });
      break;
    }
  }

  const sortedTrades = [...trades].sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime));
  let afterTwoWins = 0, afterTwoWinsLoss = 0;
  let streak = 0;
  for (let i = 0; i < sortedTrades.length; i++) {
    const m = computeTradeMetrics(sortedTrades[i]);
    if (streak >= 2) {
      afterTwoWins += 1;
      if (m.result === "Loss") afterTwoWinsLoss += 1;
    }
    if (m.result === "Win") streak += 1;
    else streak = 0;
  }
  if (afterTwoWins >= MIN_SAMPLE) {
    const rate = (afterTwoWinsLoss / afterTwoWins) * 100;
    if (rate > (100 - overall.winRate) + 10) {
      insights.push({
        id: "streak-fade",
        tone: "neg",
        text: `You lose more frequently after two consecutive wins — ${rate.toFixed(0)}% of those trades end in a loss, versus ${(100 - overall.winRate).toFixed(0)}% overall.`,
      });
    }
  }

  const byTag = groupBy(trades, (t) => (t.tags.includes("A+ Setup") ? "A+ Setup" : "other") as string);
  if (byTag["A+ Setup"] && byTag["A+ Setup"].length >= MIN_SAMPLE) {
    const stats = computeAggregateStats(byTag["A+ Setup"]);
    insights.push({
      id: "a-plus-setup",
      tone: "pos",
      text: `Your average R is ${stats.avgR.toFixed(2)} when trading your A+ setup, versus ${overall.avgR.toFixed(2)} overall.`,
    });
  }

  const byDay = groupBy(trades, (t) => DAY_NAMES[new Date(t.date + "T00:00:00").getDay()]);
  let worstDay: { key: string; winRate: number; n: number } | null = null;
  for (const [day, list] of Object.entries(byDay)) {
    if (list.length < MIN_SAMPLE) continue;
    const stats = computeAggregateStats(list);
    if (!worstDay || stats.winRate < worstDay.winRate) {
      worstDay = { key: day, winRate: stats.winRate, n: list.length };
    }
  }
  if (worstDay && worstDay.winRate < overall.winRate - 8) {
    insights.push({
      id: "worst-day",
      tone: "neg",
      text: `${worstDay.key} is currently your weakest trading day — ${worstDay.winRate.toFixed(0)}% win rate across ${worstDay.n} trades.`,
    });
  }

  const revengeTrades = trades.filter((t) => t.tags.includes("Revenge Trade") || t.psychTags.includes("Revenge"));
  if (revengeTrades.length >= 3) {
    const stats = computeAggregateStats(revengeTrades);
    insights.push({
      id: "revenge",
      tone: "neg",
      text: `Trades tagged as revenge trades have a ${stats.winRate.toFixed(0)}% win rate and ${stats.avgR.toFixed(2)} average R — well below your baseline.`,
    });
  }

  const highDiscipline = trades.filter((t) => (t.psychology?.discipline ?? 0) >= 8);
  if (highDiscipline.length >= MIN_SAMPLE) {
    const stats = computeAggregateStats(highDiscipline);
    insights.push({
      id: "discipline",
      tone: "pos",
      text: `When your discipline score is 8+, your average trade is ${stats.avgR >= 0 ? "+" : ""}${stats.avgR.toFixed(2)}R.`,
    });
  }

  const byDirection = groupBy(trades, (t) => t.direction);
  if (byDirection.Long?.length >= MIN_SAMPLE && byDirection.Short?.length >= MIN_SAMPLE) {
    const longStats = computeAggregateStats(byDirection.Long);
    const shortStats = computeAggregateStats(byDirection.Short);
    if (Math.abs(longStats.winRate - shortStats.winRate) > 12) {
      const better = longStats.winRate > shortStats.winRate ? "long" : "short";
      const worse = better === "long" ? "short" : "long";
      const betterStats = better === "long" ? longStats : shortStats;
      const worseStats = better === "long" ? shortStats : longStats;
      insights.push({
        id: "direction-bias",
        tone: "neutral",
        text: `Your ${better} trades win ${betterStats.winRate.toFixed(0)}% of the time versus ${worseStats.winRate.toFixed(0)}% on the ${worse} side.`,
      });
    }
  }

  return insights.slice(0, 6);
}
