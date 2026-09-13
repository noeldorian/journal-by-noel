import type { DailyCheckIn, PsychologyRatings, Trade } from "./types";
import { computeAggregateStats, computeTradeMetrics, groupBy } from "./calculations";
import { toLocalDateStr } from "./utils";

// The Monday that starts the trading week containing `dateStr` — every
// review is keyed by this, so "this week" always resolves to the same row
// no matter which day of the week you open it on.
export function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalDateStr(d);
}

export function weekRange(weekStart: string): { start: string; end: string } {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: weekStart, end: toLocalDateStr(end) };
}

export function weekRangeLabel(weekStart: string): string {
  const { start, end } = weekRange(weekStart);
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  // Always include the month on both ends — Intl.DateTimeFormat's fallback
  // for { day, year } alone (no month) renders oddly (e.g. "2026 (day:
  // 13)") in some engines rather than a clean "13, 2026".
  const startLabel = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export interface WeekStats {
  weekStart: string;
  tradeCount: number;
  netPnl: number;
  winRate: number;
  bestTrade: (Trade & { netPnl: number }) | null;
  worstTrade: (Trade & { netPnl: number }) | null;
  mostTradedInstrument: string | null;
  disciplineDays: number; // "post" check-ins logged this week that qualified as a good day
  checkInsLogged: number;
  avgPsychology: Partial<PsychologyRatings>;
}

export function computeWeekStats(trades: Trade[], checkIns: DailyCheckIn[], weekStart: string): WeekStats {
  const { start, end } = weekRange(weekStart);
  const weekTrades = trades.filter((t) => t.date >= start && t.date <= end);
  const weekCheckIns = checkIns.filter((c) => c.date >= start && c.date <= end);

  const agg = computeAggregateStats(weekTrades);
  const withMetrics = weekTrades.map((t) => ({ trade: t, netPnl: computeTradeMetrics(t).netPnl }));
  withMetrics.sort((a, b) => a.netPnl - b.netPnl);
  const worst = withMetrics[0];
  const best = withMetrics[withMetrics.length - 1];

  const byInstrument = groupBy(weekTrades, (t) => t.instrument);
  const mostTradedInstrument =
    Object.entries(byInstrument).sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? null;

  const postCheckIns = weekCheckIns.filter((c) => c.type === "post");
  const disciplineDays = postCheckIns.filter(
    (c) => c.followedPlan === true && c.overtraded !== true && c.revengeTraded !== true && c.respectedRisk !== false
  ).length;

  const psychTrades = weekTrades.filter((t) => t.psychology);
  const avgPsychology: Partial<PsychologyRatings> = {};
  if (psychTrades.length > 0) {
    (["confidence", "patience", "discipline", "focus", "emotionalControl"] as const).forEach((key) => {
      avgPsychology[key] = psychTrades.reduce((s, t) => s + (t.psychology?.[key] ?? 0), 0) / psychTrades.length;
    });
  }

  return {
    weekStart,
    tradeCount: weekTrades.length,
    netPnl: agg.netPnl,
    winRate: agg.winRate,
    bestTrade: best && best.netPnl > 0 ? { ...best.trade, netPnl: best.netPnl } : null,
    worstTrade: worst && worst.netPnl < 0 ? { ...worst.trade, netPnl: worst.netPnl } : null,
    mostTradedInstrument,
    disciplineDays,
    checkInsLogged: weekCheckIns.length,
    avgPsychology,
  };
}

export interface TraderArchetype {
  name: string;
  emoji: string;
  blurb: string;
}

// A playful "Spotify Wrapped"-style label for the week — pure fun, computed
// fresh from that week's numbers every time rather than a fixed trait per
// user, so it can genuinely change week to week.
export function traderArchetype(stats: WeekStats): TraderArchetype {
  if (stats.tradeCount === 0) {
    return { name: "The Observer", emoji: "🧘", blurb: "Sat on your hands this week — sometimes the best trade is no trade." };
  }
  const disciplineRatio = stats.checkInsLogged > 0 ? stats.disciplineDays / stats.checkInsLogged : 0;
  const avgDiscipline = stats.avgPsychology.discipline ?? 0;

  if (stats.netPnl > 0 && disciplineRatio >= 0.8 && avgDiscipline >= 7) {
    return { name: "The Sniper", emoji: "🎯", blurb: "Selective, disciplined, and it paid off — a week worth repeating." };
  }
  if (stats.tradeCount >= 15) {
    return { name: "The Grinder", emoji: "⚙️", blurb: "High volume this week — worth checking whether every one of those setups earned its place." };
  }
  if (stats.netPnl > 0 && disciplineRatio < 0.5) {
    return { name: "The Lucky Streak", emoji: "🍀", blurb: "Green week, shaky process — the market was generous. Won't always be." };
  }
  if (stats.netPnl <= 0 && disciplineRatio >= 0.8) {
    return { name: "The Stoic", emoji: "🛡️", blurb: "Red week, but you stuck to the plan — that's the part that compounds." };
  }
  if (stats.netPnl < 0 && disciplineRatio < 0.4) {
    return { name: "The Storm Chaser", emoji: "🌪️", blurb: "A rough one, and the process slipped too. Worth a slower week next." };
  }
  if (stats.winRate >= 65) {
    return { name: "The Precision Player", emoji: "🔬", blurb: "High hit rate this week — your read on the market was sharp." };
  }
  return { name: "The Steady Hand", emoji: "🤝", blurb: "An ordinary week, logged honestly — that's exactly how an edge gets found." };
}

export const MOOD_OPTIONS = ["😩", "😕", "😐", "🙂", "🤩"] as const;
