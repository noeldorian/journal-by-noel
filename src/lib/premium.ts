import { FREE_TIER_LIMITS, isPremiumStatus } from "./types";
import type { Account, Subscription, Trade } from "./types";

export function isPremium(subscription: Subscription) {
  return isPremiumStatus(subscription.status);
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;
}

export function tradesThisMonth(trades: Trade[]) {
  const key = currentMonthKey();
  return trades.filter((t) => t.date.startsWith(key)).length;
}

export function canAddTrade(subscription: Subscription, trades: Trade[]) {
  if (isPremium(subscription)) return true;
  return tradesThisMonth(trades) < FREE_TIER_LIMITS.maxTradesPerMonth;
}

export function canAddAccount(subscription: Subscription, accounts: Account[]) {
  if (isPremium(subscription)) return true;
  return accounts.length < FREE_TIER_LIMITS.maxAccounts;
}
