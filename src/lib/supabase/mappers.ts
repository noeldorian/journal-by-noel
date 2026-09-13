// Converts between Postgres rows (snake_case, as defined in supabase/schema.sql)
// and the app's camelCase domain types (src/lib/types.ts). Keeping this in one
// file means the rest of the app never has to think about column names.
import type {
  Account,
  DailyCheckIn,
  InstrumentSymbol,
  NotificationItem,
  Payout,
  Priority,
  Session,
  Strategy,
  Subscription,
  Trade,
  TradingStyle,
  UserProfile,
  UserSettings,
} from "@/lib/types";

export function accountToRow(a: Account, userId: string) {
  return {
    id: a.id,
    user_id: userId,
    name: a.name,
    type: a.type,
    broker: a.broker ?? null,
    starting_balance: a.startingBalance,
    current_balance: a.currentBalance,
    currency: a.currency,
    account_size: a.accountSize,
    risk_per_trade_pct: a.riskPerTradePct,
    daily_loss_limit: a.dailyLossLimit,
    profit_target: a.profitTarget,
    max_drawdown: a.maxDrawdown,
    max_contracts: a.maxContracts ?? null,
    max_trades_per_day: a.maxTradesPerDay ?? null,
    max_consecutive_losses: a.maxConsecutiveLosses ?? null,
    prop_firm_mode: a.propFirmMode,
    archived: a.archived ?? false,
    created_at: a.createdAt,
  };
}

export function rowToAccount(r: Record<string, unknown>): Account {
  return {
    id: r.id as string,
    name: r.name as string,
    type: r.type as Account["type"],
    broker: (r.broker as string) ?? undefined,
    startingBalance: Number(r.starting_balance),
    currentBalance: Number(r.current_balance),
    currency: r.currency as Account["currency"],
    accountSize: Number(r.account_size),
    riskPerTradePct: Number(r.risk_per_trade_pct),
    dailyLossLimit: Number(r.daily_loss_limit),
    profitTarget: Number(r.profit_target),
    maxDrawdown: Number(r.max_drawdown),
    maxContracts: r.max_contracts == null ? undefined : Number(r.max_contracts),
    maxTradesPerDay: r.max_trades_per_day == null ? undefined : Number(r.max_trades_per_day),
    maxConsecutiveLosses: r.max_consecutive_losses == null ? undefined : Number(r.max_consecutive_losses),
    propFirmMode: Boolean(r.prop_firm_mode),
    archived: Boolean(r.archived),
    createdAt: r.created_at as string,
  };
}

export function tradeToRow(t: Trade, userId: string) {
  return {
    id: t.id,
    user_id: userId,
    account_id: t.accountId || null,
    date: t.date,
    entry_time: t.entryTime,
    exit_time: t.exitTime,
    instrument: t.instrument,
    direction: t.direction,
    session: t.session,
    entry_price: t.entryPrice ?? null,
    exit_price: t.exitPrice ?? null,
    stop_loss: t.stopLoss ?? null,
    take_profit: t.takeProfit ?? null,
    gross_pnl: t.grossPnl ?? null,
    net_pnl: t.netPnl ?? null,
    contracts: t.contracts,
    fees: t.fees,
    slippage: t.slippage,
    setup: t.setup ?? null,
    strategy_id: t.strategyId ?? null,
    tags: t.tags,
    psych_tags: t.psychTags,
    psychology: t.psychology ?? null,
    notes: t.notes ?? {},
    screenshots: t.screenshots ?? [],
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function rowToTrade(r: Record<string, unknown>): Trade {
  return {
    id: r.id as string,
    accountId: (r.account_id as string) ?? "",
    date: r.date as string,
    entryTime: (r.entry_time as string).slice(0, 5),
    exitTime: (r.exit_time as string).slice(0, 5),
    instrument: r.instrument as InstrumentSymbol,
    direction: r.direction as Trade["direction"],
    session: r.session as Session,
    entryPrice: r.entry_price == null ? undefined : Number(r.entry_price),
    exitPrice: r.exit_price == null ? undefined : Number(r.exit_price),
    stopLoss: r.stop_loss == null ? undefined : Number(r.stop_loss),
    takeProfit: r.take_profit == null ? undefined : Number(r.take_profit),
    grossPnl: r.gross_pnl == null ? undefined : Number(r.gross_pnl),
    netPnl: r.net_pnl == null ? undefined : Number(r.net_pnl),
    contracts: Number(r.contracts),
    fees: Number(r.fees),
    slippage: Number(r.slippage),
    setup: (r.setup as string) ?? undefined,
    strategyId: (r.strategy_id as string) ?? undefined,
    tags: (r.tags as string[]) ?? [],
    psychTags: (r.psych_tags as Trade["psychTags"]) ?? [],
    psychology: (r.psychology as Trade["psychology"]) ?? undefined,
    notes: (r.notes as Trade["notes"]) ?? {},
    screenshots: (r.screenshots as Trade["screenshots"]) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export function strategyToRow(s: Strategy, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    description: s.description,
    entry_criteria: s.entryCriteria,
    confirmation_criteria: s.confirmationCriteria,
    stop_loss_rules: s.stopLossRules,
    take_profit_rules: s.takeProfitRules,
    invalidations: s.invalidations,
    preferred_sessions: s.preferredSessions,
    preferred_instruments: s.preferredInstruments,
    notes: s.notes,
    screenshots: s.screenshots ?? [],
    created_at: s.createdAt,
  };
}

export function rowToStrategy(r: Record<string, unknown>): Strategy {
  return {
    id: r.id as string,
    name: r.name as string,
    description: r.description as string,
    entryCriteria: r.entry_criteria as string,
    confirmationCriteria: r.confirmation_criteria as string,
    stopLossRules: r.stop_loss_rules as string,
    takeProfitRules: r.take_profit_rules as string,
    invalidations: r.invalidations as string,
    preferredSessions: (r.preferred_sessions as Session[]) ?? [],
    preferredInstruments: (r.preferred_instruments as InstrumentSymbol[]) ?? [],
    notes: r.notes as string,
    screenshots: (r.screenshots as Strategy["screenshots"]) ?? [],
    createdAt: r.created_at as string,
  };
}

export function checkInToRow(c: DailyCheckIn, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    date: c.date,
    type: c.type,
    bias: c.bias ?? null,
    levels: c.levels ?? null,
    max_daily_risk: c.maxDailyRisk ?? null,
    setups_watching: c.setupsWatching ?? null,
    invalidation: c.invalidation ?? null,
    followed_plan: c.followedPlan ?? null,
    overtraded: c.overtraded ?? null,
    revenge_traded: c.revengeTraded ?? null,
    respected_risk: c.respectedRisk ?? null,
    what_worked: c.whatWorked ?? null,
    what_didnt: c.whatDidnt ?? null,
    improve_tomorrow: c.improveTomorrow ?? null,
    created_at: c.createdAt,
  };
}

export function rowToCheckIn(r: Record<string, unknown>): DailyCheckIn {
  return {
    id: r.id as string,
    date: r.date as string,
    type: r.type as DailyCheckIn["type"],
    bias: (r.bias as string) ?? undefined,
    levels: (r.levels as string) ?? undefined,
    maxDailyRisk: (r.max_daily_risk as string) ?? undefined,
    setupsWatching: (r.setups_watching as string) ?? undefined,
    invalidation: (r.invalidation as string) ?? undefined,
    followedPlan: (r.followed_plan as boolean) ?? undefined,
    overtraded: (r.overtraded as boolean) ?? undefined,
    revengeTraded: (r.revenge_traded as boolean) ?? undefined,
    respectedRisk: (r.respected_risk as boolean) ?? undefined,
    whatWorked: (r.what_worked as string) ?? undefined,
    whatDidnt: (r.what_didnt as string) ?? undefined,
    improveTomorrow: (r.improve_tomorrow as string) ?? undefined,
    createdAt: r.created_at as string,
  };
}

export function rowToNotification(r: Record<string, unknown>): NotificationItem {
  return {
    id: r.id as string,
    title: r.title as string,
    body: r.body as string,
    type: r.type as NotificationItem["type"],
    read: Boolean(r.read),
    createdAt: r.created_at as string,
  };
}

export function rowToProfile(r: Record<string, unknown>, email: string): UserProfile {
  return {
    id: r.id as string,
    firstName: (r.first_name as string) ?? "",
    lastName: (r.last_name as string) ?? "",
    email,
    avatarInitials: (r.avatar_initials as string) ?? "",
    timezone: (r.timezone as string) ?? "America/New_York",
    createdAt: r.created_at as string,
    emailVerified: true,
    onboardingCompleted: Boolean(r.onboarding_completed),
    instrumentsTraded: (r.instruments_traded as InstrumentSymbol[]) ?? [],
    tradingStyle: (r.trading_style as TradingStyle) ?? undefined,
    priorities: (r.priorities as Priority[]) ?? [],
  };
}

export function profileToRow(p: UserProfile) {
  return {
    first_name: p.firstName,
    last_name: p.lastName,
    avatar_initials: p.avatarInitials,
    timezone: p.timezone,
    onboarding_completed: p.onboardingCompleted,
    instruments_traded: p.instrumentsTraded,
    trading_style: p.tradingStyle ?? null,
    priorities: p.priorities,
  };
}

export function rowToSettings(r: Record<string, unknown> | null): UserSettings {
  return {
    timezone: (r?.timezone as string) ?? "America/New_York",
    defaultAccountId: (r?.default_account_id as string) ?? undefined,
    defaultInstrument: (r?.default_instrument as InstrumentSymbol) ?? undefined,
    defaultRiskPct: r ? Number(r.default_risk_pct) : 0.5,
    defaultSession: (r?.default_session as Session) ?? "New York",
    theme: (r?.theme as UserSettings["theme"]) ?? "dark",
    accentColor: (r?.accent_color as UserSettings["accentColor"]) ?? "purple",
    defaultTags: [],
    emailNotifications: r ? Boolean(r.email_notifications) : true,
    pushNotifications: r ? Boolean(r.push_notifications) : true,
    dailySummary: r ? Boolean(r.daily_summary) : true,
    weeklySummary: r ? Boolean(r.weekly_summary) : true,
    sidebarCollapsed: r ? Boolean(r.sidebar_collapsed) : false,
  };
}

export function settingsToRow(s: Partial<UserSettings>) {
  const row: Record<string, unknown> = {};
  if (s.timezone !== undefined) row.timezone = s.timezone;
  if (s.defaultAccountId !== undefined) row.default_account_id = s.defaultAccountId;
  if (s.defaultInstrument !== undefined) row.default_instrument = s.defaultInstrument;
  if (s.defaultRiskPct !== undefined) row.default_risk_pct = s.defaultRiskPct;
  if (s.defaultSession !== undefined) row.default_session = s.defaultSession;
  if (s.theme !== undefined) row.theme = s.theme;
  if (s.accentColor !== undefined) row.accent_color = s.accentColor;
  if (s.emailNotifications !== undefined) row.email_notifications = s.emailNotifications;
  if (s.pushNotifications !== undefined) row.push_notifications = s.pushNotifications;
  if (s.dailySummary !== undefined) row.daily_summary = s.dailySummary;
  if (s.weeklySummary !== undefined) row.weekly_summary = s.weeklySummary;
  if (s.sidebarCollapsed !== undefined) row.sidebar_collapsed = s.sidebarCollapsed;
  return row;
}

export function payoutToRow(p: Payout, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    account_id: p.accountId ?? null,
    date: p.date,
    amount: p.amount,
    type: p.type,
    status: p.status,
    method: p.method ?? null,
    notes: p.notes ?? null,
    created_at: p.createdAt,
  };
}

export function rowToPayout(r: Record<string, unknown>): Payout {
  return {
    id: r.id as string,
    accountId: (r.account_id as string) ?? undefined,
    date: r.date as string,
    amount: Number(r.amount),
    type: r.type as Payout["type"],
    status: r.status as Payout["status"],
    method: (r.method as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: r.created_at as string,
  };
}

export function rowToSubscription(r: Record<string, unknown> | null): Subscription {
  return {
    status: (r?.status as Subscription["status"]) ?? "free",
    stripeCustomerId: (r?.stripe_customer_id as string) ?? undefined,
    currentPeriodEnd: (r?.current_period_end as string) ?? undefined,
    cancelAtPeriodEnd: r ? Boolean(r.cancel_at_period_end) : false,
  };
}
