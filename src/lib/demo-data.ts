import { Rng } from "./seeded-random";
import { INSTRUMENTS } from "./instruments";
import { computeTradeMetrics } from "./calculations";
import { mondayOf } from "./weekly-review";
import { toLocalDateStr, uid } from "./utils";
import type {
  Account,
  AppDatabase,
  DailyCheckIn,
  Direction,
  InstrumentSymbol,
  NotificationItem,
  Payout,
  PsychTag,
  RewardPointEvent,
  Session,
  Strategy,
  Trade,
  UserProfile,
  UserSettings,
  WeeklyReview,
} from "./types";

export const DEFAULT_TAGS = [
  "FVG",
  "IFVG",
  "Liquidity Sweep",
  "SMT",
  "CISD",
  "Breakout",
  "Reversal",
  "A+ Setup",
  "Revenge Trade",
  "FOMO",
  "Early Entry",
  "Overleveraged",
  "Followed Plan",
];

const GOOD_TAGS = ["A+ Setup", "Followed Plan", "FVG", "Liquidity Sweep", "CISD", "SMT"];
const BAD_TAGS = ["Revenge Trade", "FOMO", "Early Entry", "Overleveraged"];
const PSYCH_BAD_TAGS: PsychTag[] = ["FOMO", "Revenge", "Hesitation", "Greed", "Fear", "Overconfidence", "Impatience", "Boredom"];

function isWeekday(d: Date) {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function round(value: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(value * f) / f;
}

function roundToTick(price: number, tickSize: number) {
  return round(Math.round(price / tickSize) * tickSize, 4);
}

interface StrategyDef {
  id: string;
  name: string;
  description: string;
  entryCriteria: string;
  confirmationCriteria: string;
  stopLossRules: string;
  takeProfitRules: string;
  invalidations: string;
  preferredSessions: Session[];
  preferredInstruments: InstrumentSymbol[];
  notes: string;
  winRate: number; // baseline probability used to synthesize outcomes
  targetR: number;
}

const STRATEGY_DEFS: StrategyDef[] = [
  {
    id: "strat_ny_liquidity_reversal",
    name: "NY Liquidity Reversal",
    description: "Fade a liquidity sweep of the prior session high/low during the New York open, entering on a confirmed shift in short-term structure.",
    entryCriteria: "Price sweeps a clear prior-session high or low within the first 45 minutes of NY session.",
    confirmationCriteria: "5m CISD (change in state of delivery) back through the sweep level, with an FVG left behind on the reversal leg.",
    stopLossRules: "Stop placed beyond the sweep wick, no more than 20 points on NQ / 5 points on ES.",
    takeProfitRules: "Scale at 1R and 2R, trail remainder toward prior session's opposing liquidity pool.",
    invalidations: "No clean 5m CISD within 15 minutes of the sweep, or sweep occurs on low relative volume.",
    preferredSessions: ["New York"],
    preferredInstruments: ["NQ", "ES", "MNQ", "MES"],
    notes: "This is the highest expectancy setup in the playbook — patience for confirmation is what separates the A+ version from the FOMO version.",
    winRate: 0.78,
    targetR: 2.1,
  },
  {
    id: "strat_london_fvg_continuation",
    name: "London FVG Continuation",
    description: "Trade in the direction of the Asian-to-London handoff, entering on a retracement into a fresh fair value gap.",
    entryCriteria: "Clear directional bias established in the first hour of London; price pulls back into an unmitigated FVG.",
    confirmationCriteria: "Lower-timeframe rejection candle inside the FVG with momentum resuming in trend direction.",
    stopLossRules: "Stop beyond the FVG plus a small buffer.",
    takeProfitRules: "Target the London session high/low or a fixed 2R, whichever comes first.",
    invalidations: "FVG fully mitigated and price closes through it with conviction.",
    preferredSessions: ["London"],
    preferredInstruments: ["NQ", "ES"],
    notes: "Works best on trend days; skip on days with a tight overnight range.",
    winRate: 0.68,
    targetR: 1.8,
  },
  {
    id: "strat_orb_momentum",
    name: "ORB Momentum Breakout",
    description: "Breakout of the opening range with strong momentum and expanding volume in the first 30 minutes of the New York session.",
    entryCriteria: "Price breaks and closes outside the opening 15-minute range on strong momentum.",
    confirmationCriteria: "Retest of the range boundary holds, or momentum candle closes without significant wick rejection.",
    stopLossRules: "Stop inside the opening range, sized to keep risk under 1% of account.",
    takeProfitRules: "Trail using a structure-based stop; take partials into measured-move extension.",
    invalidations: "Price re-enters the opening range and closes back inside it.",
    preferredSessions: ["New York"],
    preferredInstruments: ["NQ", "MNQ"],
    notes: "Best on CPI/FOMC and other high-catalyst days; avoid on quiet, low-range mornings.",
    winRate: 0.6,
    targetR: 1.6,
  },
  {
    id: "strat_asian_range_fade",
    name: "Asian Range Fade",
    description: "Fade extremes of the overnight Asian range when no clear catalyst is present, targeting mean reversion back to range midpoint.",
    entryCriteria: "Price reaches the outer 10% of the established Asian range with a clear rejection wick.",
    confirmationCriteria: "Momentum divergence on the 1m/5m at the range extreme.",
    stopLossRules: "Tight stop just beyond the range extreme.",
    takeProfitRules: "Target range midpoint, occasionally full range extension on strong rejection.",
    invalidations: "Range breaks with volume and does not immediately reclaim the level.",
    preferredSessions: ["Asian"],
    preferredInstruments: ["ES", "MES"],
    notes: "Lower conviction setup — kept small size, used mainly to stay engaged during the Asian session.",
    winRate: 0.55,
    targetR: 1.3,
  },
];

function strategySetupTag(def: StrategyDef) {
  switch (def.id) {
    case "strat_ny_liquidity_reversal": return "Liquidity Sweep";
    case "strat_london_fvg_continuation": return "FVG";
    case "strat_orb_momentum": return "Breakout";
    default: return "Reversal";
  }
}

interface AccountDef {
  account: Account;
  days: number;
  activeProb: number;
  tradesPerActiveDay: [number, number];
  strategyWeights: { def: StrategyDef; weight: number }[];
  contractsRange: [number, number];
}

function buildAccounts(): AccountDef[] {
  const now = new Date();
  const topstep: Account = {
    id: "acc_topstep_50k",
    name: "Topstep 50K",
    type: "Prop Evaluation",
    broker: "Topstep",
    startingBalance: 50000,
    currentBalance: 53240,
    currency: "USD",
    accountSize: 50000,
    riskPerTradePct: 0.5,
    dailyLossLimit: 1000,
    profitTarget: 3000,
    maxDrawdown: 2000,
    maxContracts: 5,
    maxTradesPerDay: 5,
    maxConsecutiveLosses: 3,
    propFirmMode: true,
    createdAt: toLocalDateStr(new Date(now.getTime() - 95 * 86400000)),
  };
  const apex: Account = {
    id: "acc_apex_50k",
    name: "Apex 50K",
    type: "Prop Funded",
    broker: "Apex Trader Funding",
    startingBalance: 50000,
    currentBalance: 51180,
    currency: "USD",
    accountSize: 50000,
    riskPerTradePct: 0.4,
    dailyLossLimit: 1100,
    profitTarget: 100000,
    maxDrawdown: 2500,
    maxContracts: 10,
    propFirmMode: true,
    createdAt: toLocalDateStr(new Date(now.getTime() - 70 * 86400000)),
  };
  const personal: Account = {
    id: "acc_personal_25k",
    name: "Personal Futures Account",
    type: "Personal",
    broker: "Tradovate",
    startingBalance: 25000,
    currentBalance: 26410,
    currency: "USD",
    accountSize: 25000,
    riskPerTradePct: 1,
    dailyLossLimit: 500,
    profitTarget: 0,
    maxDrawdown: 0,
    propFirmMode: false,
    createdAt: toLocalDateStr(new Date(now.getTime() - 110 * 86400000)),
  };

  return [
    {
      account: topstep,
      days: 65,
      activeProb: 0.72,
      tradesPerActiveDay: [1, 3],
      strategyWeights: [
        { def: STRATEGY_DEFS[0], weight: 4 },
        { def: STRATEGY_DEFS[1], weight: 2 },
        { def: STRATEGY_DEFS[2], weight: 2 },
      ],
      contractsRange: [2, 5],
    },
    {
      account: apex,
      days: 50,
      activeProb: 0.55,
      tradesPerActiveDay: [1, 2],
      strategyWeights: [
        { def: STRATEGY_DEFS[1], weight: 3 },
        { def: STRATEGY_DEFS[2], weight: 2 },
        { def: STRATEGY_DEFS[0], weight: 2 },
      ],
      contractsRange: [3, 8],
    },
    {
      account: personal,
      days: 80,
      activeProb: 0.35,
      tradesPerActiveDay: [1, 1],
      strategyWeights: [
        { def: STRATEGY_DEFS[3], weight: 3 },
        { def: STRATEGY_DEFS[0], weight: 2 },
      ],
      contractsRange: [1, 3],
    },
  ];
}

function basePriceFor(symbol: InstrumentSymbol, dayIndex: number, rng: Rng) {
  // Slow drift + daily noise so prices look like a real, moving market.
  const anchors: Record<string, number> = { NQ: 21500, MNQ: 21500, ES: 6420, MES: 6420, YM: 41800, RTY: 2380, CL: 71, GC: 2650 };
  const drift = Math.sin(dayIndex / 9) * (symbol === "NQ" || symbol === "MNQ" ? 220 : symbol === "ES" || symbol === "MES" ? 55 : 20);
  const noise = rng.range(-1, 1) * (symbol === "NQ" || symbol === "MNQ" ? 60 : symbol === "ES" || symbol === "MES" ? 15 : 5);
  return (anchors[symbol] ?? 100) + drift + noise;
}

function sessionTimeWindow(session: Session, rng: Rng): { entry: string; exit: string } {
  const pad = (n: number) => n.toString().padStart(2, "0");
  let startHour: number, startMin: number;
  if (session === "Asian") { startHour = rng.int(19, 22); startMin = rng.int(0, 59); }
  else if (session === "London") { startHour = rng.int(2, 4); startMin = rng.int(0, 59); }
  else { startHour = rng.int(9, 11); startMin = rng.int(30, 59) % 60; }
  const durationMin = rng.int(4, 95);
  const endTotal = startHour * 60 + startMin + durationMin;
  const endHour = Math.floor(endTotal / 60) % 24;
  const endMin = endTotal % 60;
  return { entry: `${pad(startHour)}:${pad(startMin)}`, exit: `${pad(endHour)}:${pad(endMin)}` };
}

export function generateDemoDatabase(): AppDatabase {
  const rng = new Rng(20260912);
  const accountDefs = buildAccounts();
  const accounts = accountDefs.map((a) => a.account);
  const trades: Trade[] = [];
  const checkIns: DailyCheckIn[] = [];
  const now = new Date();

  for (const def of accountDefs) {
    let dayIndex = 0;
    for (let i = def.days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      if (!isWeekday(date)) continue;
      dayIndex += 1;
      const dateStr = toLocalDateStr(date);
      const active = rng.chance(def.activeProb);
      if (!active) continue;

      const tradeCount = rng.int(def.tradesPerActiveDay[0], def.tradesPerActiveDay[1]);

      if (rng.chance(0.6)) {
        checkIns.push({
          id: uid("chk"),
          date: dateStr,
          type: "pre",
          bias: rng.pick(["Bullish continuation above overnight high", "Bearish rejection at prior day high", "Neutral, waiting for a liquidity sweep", "Bullish reversal off weekly demand"]),
          levels: rng.pick(["Prior day high/low, overnight high/low, weekly open", "Yesterday's VWAP, session opening range", "Weekly high, Monday range extremes"]),
          maxDailyRisk: `${def.account.riskPerTradePct * (rng.int(2, 3))}% of account`,
          setupsWatching: rng.pick(["Liquidity sweep + CISD at NY open", "FVG retracement in trend direction", "Opening range breakout with volume"]),
          invalidation: "Choppy overlapping price action with no clean sweep or break of structure.",
          createdAt: `${dateStr}T08:15:00.000Z`,
        });
      }

      for (let t = 0; t < tradeCount; t++) {
        const stratDef = rng.weightedPick(def.strategyWeights.map((w) => ({ value: w.def, weight: w.weight })));
        const instrument = rng.pick(stratDef.preferredInstruments.filter((s) => ["NQ", "ES", "MNQ", "MES"].includes(s)));
        const spec = INSTRUMENTS[instrument];
        const session = rng.pick(stratDef.preferredSessions);
        const direction: Direction = rng.chance(0.52) ? "Long" : "Short";
        const dirMult = direction === "Long" ? 1 : -1;

        const entryPriceRaw = basePriceFor(instrument, dayIndex + t, rng);
        const entryPrice = roundToTick(entryPriceRaw, spec.tickSize);

        const isMicro = instrument === "MNQ" || instrument === "MES";
        const bigPointsBase = instrument === "NQ" || instrument === "MNQ" ? rng.range(12, 32) : rng.range(3, 7.5);
        const stopDistance = round(bigPointsBase, 2);

        const contracts = isMicro
          ? rng.int(def.contractsRange[0] * 2, def.contractsRange[1] * 2)
          : rng.int(def.contractsRange[0], def.contractsRange[1]);

        const outcomeRoll = rng.next();
        let rMultiple: number;
        if (outcomeRoll < stratDef.winRate) {
          rMultiple = round(rng.range(0.4, stratDef.targetR * 1.6), 2);
        } else if (outcomeRoll < stratDef.winRate + 0.05) {
          rMultiple = round(rng.range(-0.15, 0.15), 2);
        } else {
          rMultiple = round(-rng.range(0.6, 1.3), 2);
        }

        const riskAmount = stopDistance * spec.pointValue * contracts;
        const fees = round(contracts * rng.range(3.6, 4.8), 2);
        const slippage = round(contracts * spec.tickValue * rng.range(0, 1.2), 2);
        const netPnl = rMultiple * riskAmount;
        const grossPnl = netPnl + fees + slippage;
        const priceMove = grossPnl / (dirMult * spec.pointValue * contracts);
        const exitPrice = roundToTick(entryPrice + priceMove, spec.tickSize);
        const stopLoss = roundToTick(entryPrice - dirMult * stopDistance, spec.tickSize);
        const takeProfit = roundToTick(entryPrice + dirMult * stopDistance * stratDef.targetR, spec.tickSize);

        const isWin = netPnl > 0.01;
        const isLoss = netPnl < -0.01;
        const tags: string[] = [];
        if (isWin && rng.chance(0.75)) tags.push(rng.pick(GOOD_TAGS));
        if (isWin && rng.chance(0.3)) tags.push(rng.pick(GOOD_TAGS));
        if (isLoss && rng.chance(0.45)) tags.push(rng.pick(BAD_TAGS));
        tags.push(strategySetupTag(stratDef));
        const uniqueTags = Array.from(new Set(tags));

        const psychTags: PsychTag[] = [];
        if (isLoss && rng.chance(0.4)) psychTags.push(rng.pick(PSYCH_BAD_TAGS));

        const disciplineBase = isWin ? rng.range(7, 10) : rng.range(3, 8);
        const { entry: entryTime, exit: exitTime } = sessionTimeWindow(session, rng);

        const trade: Trade = {
          id: uid("trade"),
          accountId: def.account.id,
          date: dateStr,
          entryTime,
          exitTime,
          instrument,
          direction,
          session,
          entryPrice,
          exitPrice,
          stopLoss,
          takeProfit,
          contracts,
          fees,
          slippage,
          setup: stratDef.name,
          strategyId: stratDef.id,
          tags: uniqueTags,
          psychTags,
          psychology: {
            confidence: Math.round(clamp(disciplineBase + rng.range(-1.5, 1.5), 1, 10)),
            patience: Math.round(clamp(disciplineBase + rng.range(-2, 1), 1, 10)),
            discipline: Math.round(clamp(disciplineBase, 1, 10)),
            focus: Math.round(clamp(disciplineBase + rng.range(-1, 1.5), 1, 10)),
            emotionalControl: Math.round(clamp(disciplineBase + rng.range(-2, 1), 1, 10)),
          },
          notes: {
            preTradePlan: `Watching for ${stratDef.name.toLowerCase()} conditions on ${instrument}; plan was to size at ${contracts} contracts with a defined invalidation below/above the level.`,
            entryReason: isWin ? "Entered on confirmed confluence — structure shift plus location aligned with the playbook criteria." : "Entered slightly early relative to plan, anticipating the move rather than waiting for full confirmation.",
            management: isWin ? "Scaled partials into strength and trailed the remainder using structure." : "Held to the original stop and let the plan play out without moving it.",
            exitReason: isWin ? "Exited into the planned target zone as momentum began to stall." : "Stopped out at the predefined invalidation level.",
            postTradeReview: isWin ? "Clean execution of the plan — this is the version of the setup worth repeating." : "Review for next time: wait for the full confirmation sequence before committing size.",
            psychology: isWin ? "Felt calm and patient through the trade, no urge to move the stop or add risk." : "Noticed some impatience going into the entry; worth flagging for tomorrow's pre-market check-in.",
          },
          screenshots: [],
          createdAt: `${dateStr}T${entryTime}:00.000Z`,
          updatedAt: `${dateStr}T${exitTime}:00.000Z`,
        };
        trades.push(trade);
      }

      if (rng.chance(0.55) && tradeCount > 0) {
        const dayTrades = trades.filter((t) => t.date === dateStr && t.accountId === def.account.id);
        const dayNet = dayTrades.reduce((s, t) => s + computeTradeMetrics(t).netPnl, 0);
        checkIns.push({
          id: uid("chk"),
          date: dateStr,
          type: "post",
          followedPlan: rng.chance(dayNet >= 0 ? 0.85 : 0.55),
          overtraded: rng.chance(dayNet < 0 ? 0.3 : 0.08),
          revengeTraded: rng.chance(dayNet < 0 ? 0.22 : 0.03),
          respectedRisk: rng.chance(0.88),
          whatWorked: dayNet >= 0 ? "Waited for full confirmation before entering; sizing matched the setup quality." : "Cut the losing trade at the planned stop without hesitation.",
          whatDidnt: dayNet >= 0 ? "Could have trailed the final runner a bit further." : "Entered before full confirmation on at least one trade.",
          improveTomorrow: "Stick to the pre-market plan and only take A+ conditions.",
          createdAt: `${dateStr}T21:00:00.000Z`,
        });
      }
    }
  }

  trades.sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime));
  checkIns.sort((a, b) => a.date.localeCompare(b.date));

  const strategies: Strategy[] = STRATEGY_DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    entryCriteria: d.entryCriteria,
    confirmationCriteria: d.confirmationCriteria,
    stopLossRules: d.stopLossRules,
    takeProfitRules: d.takeProfitRules,
    invalidations: d.invalidations,
    preferredSessions: d.preferredSessions,
    preferredInstruments: d.preferredInstruments,
    notes: d.notes,
    screenshots: [],
    createdAt: toLocalDateStr(new Date(now.getTime() - 90 * 86400000)),
  }));

  const user: UserProfile = {
    id: "user_demo",
    firstName: "Noel",
    lastName: "Trader",
    email: "sznoeldorian999@gmail.com",
    avatarInitials: "NT",
    timezone: "America/New_York",
    createdAt: toLocalDateStr(new Date(now.getTime() - 95 * 86400000)),
    emailVerified: true,
    onboardingCompleted: true,
    instrumentsTraded: ["NQ", "ES", "MNQ", "MES"],
    tradingStyle: "Day Trading",
    priorities: ["Consistency", "Risk management", "Discipline"],
  };

  const settings: UserSettings = {
    timezone: "America/New_York",
    defaultAccountId: accounts[0].id,
    defaultInstrument: "NQ",
    defaultRiskPct: 0.5,
    defaultSession: "New York",
    theme: "dark",
    accentColor: "purple",
    defaultTags: DEFAULT_TAGS,
    emailNotifications: true,
    pushNotifications: true,
    dailySummary: true,
    weeklySummary: true,
    sidebarCollapsed: false,
  };

  const notifications: NotificationItem[] = [
    { id: uid("notif"), title: "Daily summary ready", body: "You closed yesterday +$412.50 across 3 trades on Topstep 50K.", type: "summary", read: false, createdAt: new Date(now.getTime() - 3600_000 * 14).toISOString() },
    { id: uid("notif"), title: "Weekly performance", body: "Net P&L this week: +$1,240.75 with a 71% win rate.", type: "summary", read: false, createdAt: new Date(now.getTime() - 3600_000 * 30).toISOString() },
    { id: uid("notif"), title: "Approaching daily loss limit", body: "Apex 50K is at 68% of its daily loss limit. Consider stepping away.", type: "risk", read: true, createdAt: new Date(now.getTime() - 3600_000 * 50).toISOString() },
    { id: uid("notif"), title: "5-day journaling streak", body: "You've logged trades 5 days in a row on Topstep 50K. Keep it going.", type: "streak", read: true, createdAt: new Date(now.getTime() - 3600_000 * 80).toISOString() },
    { id: uid("notif"), title: "Milestone reached", body: "Topstep 50K crossed +$3,000 in cumulative net P&L.", type: "milestone", read: true, createdAt: new Date(now.getTime() - 3600_000 * 120).toISOString() },
  ];

  const payouts: Payout[] = [
    { id: uid("payout"), accountId: accounts[0].id, date: toLocalDateStr(new Date(now.getTime() - 60 * 86400000)), amount: 1250, type: "Prop Payout", status: "Paid", method: "Wire", createdAt: new Date(now.getTime() - 60 * 86400000).toISOString() },
    { id: uid("payout"), accountId: accounts[0].id, date: toLocalDateStr(new Date(now.getTime() - 32 * 86400000)), amount: 2100, type: "Prop Payout", status: "Paid", method: "ACH", createdAt: new Date(now.getTime() - 32 * 86400000).toISOString() },
    { id: uid("payout"), accountId: accounts[0].id, date: toLocalDateStr(new Date(now.getTime() - 3 * 86400000)), amount: 900, type: "Prop Payout", status: "Pending", method: "Wire", createdAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
  ];

  const rewardPointEvents: RewardPointEvent[] = [
    { id: uid("rpe"), date: toLocalDateStr(new Date(now.getTime() - 2 * 86400000)), points: 10, reason: "good_day", createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { id: uid("rpe"), date: toLocalDateStr(new Date(now.getTime() - 5 * 86400000)), points: 10, reason: "good_day", createdAt: new Date(now.getTime() - 5 * 86400000).toISOString() },
    { id: uid("rpe"), date: toLocalDateStr(new Date(now.getTime() - 9 * 86400000)), points: 10, reason: "good_day", createdAt: new Date(now.getTime() - 9 * 86400000).toISOString() },
  ];

  const lastWeekMonday = new Date(now.getTime() - 14 * 86400000);
  const weeklyReviews: WeeklyReview[] = [
    {
      id: uid("review"),
      weekStart: mondayOf(toLocalDateStr(lastWeekMonday)),
      mood: "🙂",
      wentWell: "Stuck to the NY Liquidity Reversal setup and skipped the choppy midday chop I usually get pulled into.",
      toImprove: "Sized up too fast after two green days in a row — worth slowing back down.",
      nextWeekFocus: "One A+ setup a day, max. Quality over quantity.",
      createdAt: lastWeekMonday.toISOString(),
      updatedAt: lastWeekMonday.toISOString(),
    },
  ];

  return {
    user,
    settings,
    accounts,
    activeAccountId: accounts[0].id,
    trades,
    strategies,
    tags: DEFAULT_TAGS,
    checkIns,
    notifications,
    subscription: { status: "free", cancelAtPeriodEnd: false },
    payouts,
    rewardPoints: { balance: 30, lifetimeEarned: 30 },
    rewardPointEvents,
    weeklyReviews,
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}
