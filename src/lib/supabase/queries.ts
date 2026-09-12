// Every read/write to Postgres goes through here. RLS policies on each table
// (see supabase/schema.sql) mean these queries are always implicitly scoped
// to the signed-in user — there is no way to accidentally fetch someone
// else's rows even if a bug passed the wrong id.
import { supabase } from "./client";
import {
  accountToRow, checkInToRow, profileToRow, rowToAccount, rowToCheckIn,
  rowToNotification, rowToProfile, rowToSettings, rowToStrategy, rowToTrade,
  settingsToRow, strategyToRow, tradeToRow,
} from "./mappers";
import type {
  Account, AppDatabase, DailyCheckIn, NotificationItem, Strategy, Trade, UserProfile, UserSettings,
} from "@/lib/types";

export async function fetchAppDatabase(userId: string, email: string): Promise<AppDatabase> {
  const [profileRes, settingsRes, accountsRes, tradesRes, strategiesRes, tagsRes, checkInsRes, notificationsRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("accounts").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("trades").select("*").eq("user_id", userId).order("date"),
      supabase.from("strategies").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("custom_tags").select("name").eq("user_id", userId),
      supabase.from("check_ins").select("*").eq("user_id", userId).order("date"),
      supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

  for (const res of [profileRes, settingsRes, accountsRes, tradesRes, strategiesRes, tagsRes, checkInsRes, notificationsRes]) {
    if (res.error) throw res.error;
  }

  const user: UserProfile | null = profileRes.data ? rowToProfile(profileRes.data, email) : null;
  const settings: UserSettings = rowToSettings(settingsRes.data);

  return {
    user,
    settings,
    accounts: (accountsRes.data ?? []).map(rowToAccount),
    activeAccountId: (settingsRes.data?.active_account_id as string) ?? (accountsRes.data?.[0]?.id ?? null),
    trades: (tradesRes.data ?? []).map(rowToTrade),
    strategies: (strategiesRes.data ?? []).map(rowToStrategy),
    tags: (tagsRes.data ?? []).map((t) => t.name as string),
    checkIns: (checkInsRes.data ?? []).map(rowToCheckIn),
    notifications: (notificationsRes.data ?? []).map(rowToNotification),
  };
}

export async function saveProfile(userId: string, profile: UserProfile) {
  const { error } = await supabase.from("profiles").update(profileToRow(profile)).eq("id", userId);
  if (error) throw error;
}

export async function saveSettings(userId: string, partial: Partial<UserSettings>) {
  const { error } = await supabase.from("user_settings").update(settingsToRow(partial)).eq("user_id", userId);
  if (error) throw error;
}

export async function setActiveAccountId(userId: string, accountId: string) {
  const { error } = await supabase.from("user_settings").update({ active_account_id: accountId }).eq("user_id", userId);
  if (error) throw error;
}

export async function insertAccount(userId: string, account: Account) {
  const { error } = await supabase.from("accounts").insert(accountToRow(account, userId));
  if (error) throw error;
}

const ACCOUNT_FIELD_TO_COLUMN: { [K in keyof Account]?: string } = {
  name: "name", type: "type", broker: "broker", startingBalance: "starting_balance",
  currentBalance: "current_balance", currency: "currency", accountSize: "account_size",
  riskPerTradePct: "risk_per_trade_pct", dailyLossLimit: "daily_loss_limit", profitTarget: "profit_target",
  maxDrawdown: "max_drawdown", maxContracts: "max_contracts", maxTradesPerDay: "max_trades_per_day",
  maxConsecutiveLosses: "max_consecutive_losses", propFirmMode: "prop_firm_mode", archived: "archived",
};

export async function updateAccountRow(userId: string, id: string, partial: Partial<Account>) {
  const patch: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(partial)) {
    const column = ACCOUNT_FIELD_TO_COLUMN[field as keyof Account];
    if (column) patch[column] = value;
  }
  const { error } = await supabase.from("accounts").update(patch).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteAccountRow(userId: string, id: string) {
  const { error } = await supabase.from("accounts").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function insertTrade(userId: string, trade: Trade) {
  const { error } = await supabase.from("trades").insert(tradeToRow(trade, userId));
  if (error) throw error;
}

export async function updateTradeRow(userId: string, id: string, trade: Trade) {
  const { error } = await supabase.from("trades").update(tradeToRow(trade, userId)).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteTradeRow(userId: string, id: string) {
  const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteTradeRows(userId: string, ids: string[]) {
  const { error } = await supabase.from("trades").delete().in("id", ids).eq("user_id", userId);
  if (error) throw error;
}

export async function insertTrades(userId: string, trades: Trade[]) {
  const { error } = await supabase.from("trades").insert(trades.map((t) => tradeToRow(t, userId)));
  if (error) throw error;
}

export async function insertStrategy(userId: string, strategy: Strategy) {
  const { error } = await supabase.from("strategies").insert(strategyToRow(strategy, userId));
  if (error) throw error;
}

export async function updateStrategyRow(userId: string, id: string, strategy: Strategy) {
  const { error } = await supabase.from("strategies").update(strategyToRow(strategy, userId)).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteStrategyRow(userId: string, id: string) {
  const { error } = await supabase.from("strategies").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function insertTag(userId: string, name: string) {
  const { error } = await supabase.from("custom_tags").upsert({ user_id: userId, name });
  if (error) throw error;
}

export async function insertCheckIn(userId: string, checkIn: DailyCheckIn) {
  const { error } = await supabase.from("check_ins").insert(checkInToRow(checkIn, userId));
  if (error) throw error;
}

export async function updateCheckInRow(userId: string, id: string, checkIn: DailyCheckIn) {
  const { error } = await supabase.from("check_ins").update(checkInToRow(checkIn, userId)).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function markNotificationReadRow(userId: string, id: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsReadRow(userId: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  if (error) throw error;
}

export async function insertNotification(userId: string, n: NotificationItem) {
  const { error } = await supabase.from("notifications").insert({
    id: n.id, user_id: userId, title: n.title, body: n.body, type: n.type, read: n.read, created_at: n.createdAt,
  });
  if (error) throw error;
}

export async function uploadScreenshot(userId: string, tradeId: string, file: File, stage: string): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/${tradeId}/${stage}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("trade-screenshots").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("trade-screenshots").getPublicUrl(path);
  return data.publicUrl;
}
