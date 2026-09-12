import type { DerivedTradeMetrics, Trade, TradeResult } from "./types";
import { INSTRUMENTS } from "./instruments";

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function holdingMinutes(entryTime: string, exitTime: string) {
  const entry = toMinutes(entryTime);
  let exit = toMinutes(exitTime);
  if (exit < entry) exit += 24 * 60; // overnight session
  return exit - entry;
}

export function computeTradeMetrics(trade: Trade): DerivedTradeMetrics {
  const spec = INSTRUMENTS[trade.instrument];
  const dir = trade.direction === "Long" ? 1 : -1;

  const grossPnl = dir * (trade.exitPrice - trade.entryPrice) * spec.pointValue * trade.contracts;
  const netPnl = grossPnl - trade.fees - trade.slippage;

  const riskPoints = Math.abs(trade.entryPrice - trade.stopLoss);
  const riskAmount = riskPoints * spec.pointValue * trade.contracts;
  const rMultiple = riskAmount > 0 ? netPnl / riskAmount : 0;

  const positionSizeUsd = trade.entryPrice * spec.pointValue * trade.contracts;
  const riskPercent = positionSizeUsd > 0 ? (riskAmount / positionSizeUsd) * 100 : 0;

  let result: TradeResult = "Breakeven";
  if (netPnl > 0.01) result = "Win";
  else if (netPnl < -0.01) result = "Loss";

  return {
    grossPnl,
    netPnl,
    riskAmount,
    riskPercent,
    rMultiple,
    positionSizeUsd,
    holdingMinutes: holdingMinutes(trade.entryTime, trade.exitTime),
    result,
  };
}

export interface AggregateStats {
  netPnl: number;
  grossPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  lossRate: number;
  profitFactor: number;
  avgR: number;
  medianR: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  expectancy: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxDrawdown: number;
  recoveryFactor: number;
  sharpeLike: number;
}

export function emptyStats(): AggregateStats {
  return {
    netPnl: 0, grossPnl: 0, totalTrades: 0, wins: 0, losses: 0, breakevens: 0,
    winRate: 0, lossRate: 0, profitFactor: 0, avgR: 0, medianR: 0, avgWin: 0,
    avgLoss: 0, largestWin: 0, largestLoss: 0, expectancy: 0,
    maxConsecutiveWins: 0, maxConsecutiveLosses: 0, maxDrawdown: 0,
    recoveryFactor: 0, sharpeLike: 0,
  };
}

export function computeAggregateStats(trades: Trade[]): AggregateStats {
  if (trades.length === 0) return emptyStats();

  const sorted = [...trades].sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime));
  const metrics = sorted.map(computeTradeMetrics);

  const wins = metrics.filter((m) => m.result === "Win");
  const losses = metrics.filter((m) => m.result === "Loss");
  const breakevens = metrics.filter((m) => m.result === "Breakeven");

  const netPnl = metrics.reduce((s, m) => s + m.netPnl, 0);
  const grossPnl = metrics.reduce((s, m) => s + m.grossPnl, 0);
  const grossProfit = wins.reduce((s, m) => s + m.netPnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, m) => s + m.netPnl, 0));

  const rValues = metrics.map((m) => m.rMultiple);
  const avgR = rValues.reduce((s, r) => s + r, 0) / rValues.length;
  const sortedR = [...rValues].sort((a, b) => a - b);
  const medianR = sortedR.length % 2 === 0
    ? (sortedR[sortedR.length / 2 - 1] + sortedR[sortedR.length / 2]) / 2
    : sortedR[Math.floor(sortedR.length / 2)];

  const avgWin = wins.length ? wins.reduce((s, m) => s + m.netPnl, 0) / wins.length : 0;
  const avgLoss = losses.length ? losses.reduce((s, m) => s + m.netPnl, 0) / losses.length : 0;
  const largestWin = wins.length ? Math.max(...wins.map((m) => m.netPnl)) : 0;
  const largestLoss = losses.length ? Math.min(...losses.map((m) => m.netPnl)) : 0;

  const winRate = (wins.length / metrics.length) * 100;
  const lossRate = (losses.length / metrics.length) * 100;
  const expectancy = (winRate / 100) * avgWin + (lossRate / 100) * avgLoss;

  let maxConsecutiveWins = 0, maxConsecutiveLosses = 0, curW = 0, curL = 0;
  for (const m of metrics) {
    if (m.result === "Win") { curW += 1; curL = 0; }
    else if (m.result === "Loss") { curL += 1; curW = 0; }
    else { curW = 0; curL = 0; }
    maxConsecutiveWins = Math.max(maxConsecutiveWins, curW);
    maxConsecutiveLosses = Math.max(maxConsecutiveLosses, curL);
  }

  let equity = 0, peak = 0, maxDrawdown = 0;
  for (const m of metrics) {
    equity += m.netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
  }

  const mean = netPnl / metrics.length;
  const variance = metrics.reduce((s, m) => s + Math.pow(m.netPnl - mean, 2), 0) / metrics.length;
  const stdDev = Math.sqrt(variance);
  const sharpeLike = stdDev > 0 ? (mean / stdDev) * Math.sqrt(metrics.length) : 0;

  const recoveryFactor = maxDrawdown !== 0 ? netPnl / Math.abs(maxDrawdown) : netPnl > 0 ? Infinity : 0;

  return {
    netPnl, grossPnl, totalTrades: metrics.length,
    wins: wins.length, losses: losses.length, breakevens: breakevens.length,
    winRate, lossRate,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgR, medianR, avgWin, avgLoss, largestWin, largestLoss, expectancy,
    maxConsecutiveWins, maxConsecutiveLosses, maxDrawdown,
    recoveryFactor: Number.isFinite(recoveryFactor) ? recoveryFactor : 0,
    sharpeLike,
  };
}

export function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyFn(item);
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}

export function recommendedContracts(opts: {
  accountSize: number;
  riskPct: number;
  entry: number;
  stopLoss: number;
  instrument: keyof typeof INSTRUMENTS;
}) {
  const spec = INSTRUMENTS[opts.instrument];
  const riskDollar = opts.accountSize * (opts.riskPct / 100);
  const riskPoints = Math.abs(opts.entry - opts.stopLoss);
  const riskPerContract = riskPoints * spec.pointValue;
  if (riskPerContract <= 0) return { contracts: 0, riskDollar, riskPerContract: 0 };
  const contracts = Math.floor(riskDollar / riskPerContract);
  return { contracts: Math.max(contracts, 0), riskDollar, riskPerContract };
}
