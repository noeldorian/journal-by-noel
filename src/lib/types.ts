// Core domain types for Journal by Noel.
// This layer is intentionally storage-agnostic: the app talks to lib/api,
// which today reads/writes localStorage but is shaped like a real REST/DB
// client so it can be swapped for Supabase/Postgres without touching UI.

export type InstrumentSymbol =
  | "NQ"
  | "ES"
  | "MNQ"
  | "MES"
  | "YM"
  | "RTY"
  | "CL"
  | "GC";

export type TradingStyle = "Scalping" | "Day Trading" | "Swing Trading";

export type Priority =
  | "Consistency"
  | "Win rate"
  | "Risk management"
  | "Profitability"
  | "Discipline"
  | "Psychology";

export type Direction = "Long" | "Short";

export type Session = "Asian" | "London" | "New York" | "Custom";

export type TradeResult = "Win" | "Loss" | "Breakeven";

export interface InstrumentSpec {
  symbol: InstrumentSymbol;
  name: string;
  tickSize: number;
  tickValue: number;
  pointValue: number;
  category: "Index" | "Energy" | "Metal";
}

export interface Account {
  id: string;
  name: string;
  type: "Prop Evaluation" | "Prop Funded" | "Personal" | "Demo";
  broker?: string;
  startingBalance: number;
  currentBalance: number;
  currency: "USD" | "EUR" | "GBP";
  accountSize: number;
  riskPerTradePct: number;
  dailyLossLimit: number;
  profitTarget: number;
  maxDrawdown: number;
  maxContracts?: number;
  maxTradesPerDay?: number;
  maxConsecutiveLosses?: number;
  propFirmMode: boolean;
  createdAt: string;
  archived?: boolean;
}

export interface TradeScreenshot {
  id: string;
  stage: "before" | "during" | "after";
  dataUrl: string; // a Supabase Storage public URL, despite the name
  fileName: string;
  createdAt: string;
}

export interface PsychologyRatings {
  confidence: number; // 1-10
  patience: number;
  discipline: number;
  focus: number;
  emotionalControl: number;
}

export type PsychTag =
  | "FOMO"
  | "Revenge"
  | "Hesitation"
  | "Greed"
  | "Fear"
  | "Overconfidence"
  | "Impatience"
  | "Boredom";

export interface Trade {
  id: string;
  accountId: string;
  date: string; // yyyy-MM-dd
  entryTime: string; // HH:mm
  exitTime: string; // HH:mm
  instrument: InstrumentSymbol;
  direction: Direction;
  session: Session;
  // Optional: only present on trades imported from a broker CSV, or older
  // trades logged before the Add Trade form switched to plain P&L entry.
  // The journal no longer asks for these directly.
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  // Manually entered P&L — how every trade is logged today. When these are
  // set, computeTradeMetrics() uses them directly instead of deriving P&L
  // from entry/exit prices.
  grossPnl?: number;
  netPnl?: number;
  contracts: number;
  fees: number;
  slippage: number;
  setup?: string;
  strategyId?: string;
  tags: string[];
  psychTags: PsychTag[];
  psychology?: PsychologyRatings;
  notes: {
    preTradePlan?: string;
    entryReason?: string;
    management?: string;
    exitReason?: string;
    postTradeReview?: string;
    psychology?: string;
  };
  screenshots: TradeScreenshot[];
  createdAt: string;
  updatedAt: string;
}

export interface DerivedTradeMetrics {
  grossPnl: number;
  netPnl: number;
  riskAmount: number;
  riskPercent: number;
  rMultiple: number;
  positionSizeUsd: number;
  holdingMinutes: number;
  result: TradeResult;
}

export interface Strategy {
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
  screenshots: TradeScreenshot[];
  createdAt: string;
}

export interface DailyCheckIn {
  id: string;
  date: string;
  type: "pre" | "post";
  bias?: string;
  levels?: string;
  maxDailyRisk?: string;
  setupsWatching?: string;
  invalidation?: string;
  followedPlan?: boolean;
  overtraded?: boolean;
  revengeTraded?: boolean;
  respectedRisk?: boolean;
  whatWorked?: string;
  whatDidnt?: string;
  improveTomorrow?: string;
  createdAt: string;
}

export type PayoutType = "Prop Payout" | "Withdrawal" | "Other";
export type PayoutStatus = "Paid" | "Pending" | "Processing";

export interface Payout {
  id: string;
  accountId?: string;
  date: string; // yyyy-MM-dd
  amount: number;
  type: PayoutType;
  status: PayoutStatus;
  method?: string;
  notes?: string;
  createdAt: string;
}

export type AccentColor = "green" | "blue" | "white" | "purple";

export interface UserSettings {
  timezone: string;
  defaultAccountId?: string;
  defaultInstrument?: InstrumentSymbol;
  defaultRiskPct: number;
  defaultSession: Session;
  theme: "dark" | "light";
  accentColor: AccentColor;
  defaultTags: string[];
  emailNotifications: boolean;
  pushNotifications: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
  sidebarCollapsed: boolean;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarInitials: string;
  timezone: string;
  createdAt: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  instrumentsTraded: InstrumentSymbol[];
  tradingStyle?: TradingStyle;
  priorities: Priority[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: "summary" | "risk" | "drawdown" | "reminder" | "streak" | "milestone";
  read: boolean;
  createdAt: string;
}

export type SubscriptionStatus = "free" | "active" | "trialing" | "past_due" | "canceled" | "incomplete";

export interface Subscription {
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export const FREE_TIER_LIMITS = {
  maxAccounts: 1,
  maxTradesPerMonth: 10,
} as const;

// A comped Premium month from redeeming reward points sets status "active"
// with a real currentPeriodEnd 30 days out, but nothing ever flips it back
// to "free" afterward the way a real Stripe subscription's webhook would —
// there's no webhook for a redemption. So "active"/"trialing" alone isn't
// enough: once there's an expiry on record, it has to still be in the
// future. A real Stripe subscription's currentPeriodEnd keeps rolling
// forward every billing cycle while genuinely active, so this never
// penalizes a real subscriber — it only catches the comped-grant case (and,
// as a side effect, a real subscription stuck in a bad state, which should
// also not read as Premium).
export function isPremiumStatus(status: SubscriptionStatus, currentPeriodEnd?: string) {
  if (status !== "active" && status !== "trialing") return false;
  if (!currentPeriodEnd) return true;
  return new Date(currentPeriodEnd).getTime() > Date.now();
}

// Reward points: earned by logging a disciplined day (a "post" check-in
// where you followed your plan, didn't overtrade, didn't revenge trade, and
// respected risk), redeemable for a free month of Premium.
export const REWARD_POINTS_PER_GOOD_DAY = 10;
export const REWARD_POINTS_REDEMPTION_COST = 500;

export interface RewardPoints {
  balance: number;
  lifetimeEarned: number;
}

export interface RewardPointEvent {
  id: string;
  date: string;
  points: number;
  reason: string;
  createdAt: string;
}

// The Sunday Review: a weekly recap + reflection, keyed by the Monday that
// starts the trading week it covers (so "this week" always resolves to one
// row regardless of which day you open it on).
export interface WeeklyReview {
  id: string;
  weekStart: string; // yyyy-MM-dd, always a Monday
  mood?: string; // a single emoji
  wentWell?: string;
  toImprove?: string;
  nextWeekFocus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppDatabase {
  user: UserProfile | null;
  settings: UserSettings;
  accounts: Account[];
  activeAccountId: string | null;
  trades: Trade[];
  strategies: Strategy[];
  tags: string[];
  checkIns: DailyCheckIn[];
  notifications: NotificationItem[];
  subscription: Subscription;
  payouts: Payout[];
  rewardPoints: RewardPoints;
  rewardPointEvents: RewardPointEvent[];
  weeklyReviews: WeeklyReview[];
}

export type DateRangeKey = "today" | "week" | "month" | "year" | "custom";
