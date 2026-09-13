import { create } from "zustand";
import {
  deleteAccountRow, deleteStrategyRow, deleteTradeRow, deleteTradeRows,
  fetchAppDatabase, fetchSubscription, insertAccount, insertCheckIn, insertNotification, insertStrategy,
  insertTag, insertTrade, insertTrades, markAllNotificationsReadRow, markNotificationReadRow,
  saveProfile, saveSettings, setActiveAccountId, updateAccountRow, updateCheckInRow,
  updateStrategyRow, updateTradeRow,
} from "./supabase/queries";
import type {
  Account,
  AppDatabase,
  DailyCheckIn,
  NotificationItem,
  Strategy,
  Trade,
  UserProfile,
  UserSettings,
} from "./types";

// Every mutation below follows the same shape: update local state immediately
// (so the UI never waits on the network), then fire the matching Supabase
// write in the background. Row Level Security on every table means these
// writes can never touch another user's data even if `userId` were wrong.
// A failed background write is logged to the console rather than rolled
// back locally — acceptable for a single-user journal, but worth knowing if
// you're extending this: there's no retry/conflict handling here.
function logFailure(action: string) {
  return (err: unknown) => console.error(`[store] ${action} failed to sync to Supabase`, err);
}

interface AppState extends AppDatabase {
  userId: string | null;
  hydrated: boolean;

  loadForUser: (userId: string, email: string) => Promise<void>;
  clear: () => void;

  setUser: (user: UserProfile) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;

  addAccount: (account: Account) => void;
  updateAccount: (id: string, partial: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  setActiveAccount: (id: string) => void;

  addTrade: (trade: Trade) => void;
  updateTrade: (id: string, partial: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  deleteTrades: (ids: string[]) => void;
  importTrades: (trades: Trade[]) => void;

  addStrategy: (strategy: Strategy) => void;
  updateStrategy: (id: string, partial: Partial<Strategy>) => void;
  deleteStrategy: (id: string) => void;

  addTag: (tag: string) => void;

  addCheckIn: (checkIn: DailyCheckIn) => void;
  updateCheckIn: (id: string, partial: Partial<DailyCheckIn>) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (n: NotificationItem) => void;

  refreshSubscription: () => Promise<void>;
}

const emptyDb = (): AppDatabase => ({
  user: null,
  settings: {
    timezone: "America/New_York",
    defaultRiskPct: 0.5,
    defaultSession: "New York",
    theme: "dark",
    accentColor: "green",
    defaultTags: [],
    emailNotifications: true,
    pushNotifications: true,
    dailySummary: true,
    weeklySummary: true,
    sidebarCollapsed: false,
  },
  accounts: [],
  activeAccountId: null,
  trades: [],
  strategies: [],
  tags: [],
  checkIns: [],
  notifications: [],
  subscription: { status: "free", cancelAtPeriodEnd: false },
});

export const useAppStore = create<AppState>((set, get) => ({
  ...emptyDb(),
  userId: null,
  hydrated: false,

  loadForUser: async (userId, email) => {
    set({ hydrated: false });
    const db = await fetchAppDatabase(userId, email);
    set({ ...db, userId, hydrated: true });
  },

  clear: () => set({ ...emptyDb(), userId: null, hydrated: false }),

  setUser: (user) => {
    set({ user });
    const userId = get().userId;
    if (userId) saveProfile(userId, user).catch(logFailure("setUser"));
  },
  updateSettings: (partial) => {
    set({ settings: { ...get().settings, ...partial } });
    const userId = get().userId;
    if (userId) saveSettings(userId, partial).catch(logFailure("updateSettings"));
  },

  addAccount: (account) => {
    set({ accounts: [...get().accounts, account] });
    const userId = get().userId;
    if (userId) insertAccount(userId, account).catch(logFailure("addAccount"));
  },
  updateAccount: (id, partial) => {
    set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...partial } : a)) });
    const userId = get().userId;
    if (userId) updateAccountRow(userId, id, partial).catch(logFailure("updateAccount"));
  },
  deleteAccount: (id) => {
    const accounts = get().accounts.filter((a) => a.id !== id);
    const activeAccountId = get().activeAccountId === id ? accounts[0]?.id ?? null : get().activeAccountId;
    set({ accounts, activeAccountId });
    const userId = get().userId;
    if (userId) {
      deleteAccountRow(userId, id).catch(logFailure("deleteAccount"));
      if (activeAccountId) setActiveAccountId(userId, activeAccountId).catch(logFailure("deleteAccount:reassignActive"));
    }
  },
  setActiveAccount: (id) => {
    set({ activeAccountId: id });
    const userId = get().userId;
    if (userId) setActiveAccountId(userId, id).catch(logFailure("setActiveAccount"));
  },

  addTrade: (trade) => {
    set({ trades: [...get().trades, trade] });
    const userId = get().userId;
    if (userId) insertTrade(userId, trade).catch(logFailure("addTrade"));
  },
  updateTrade: (id, partial) => {
    let merged: Trade | undefined;
    set({
      trades: get().trades.map((t) => {
        if (t.id !== id) return t;
        merged = { ...t, ...partial, updatedAt: new Date().toISOString() };
        return merged;
      }),
    });
    const userId = get().userId;
    if (userId && merged) updateTradeRow(userId, id, merged).catch(logFailure("updateTrade"));
  },
  deleteTrade: (id) => {
    set({ trades: get().trades.filter((t) => t.id !== id) });
    const userId = get().userId;
    if (userId) deleteTradeRow(userId, id).catch(logFailure("deleteTrade"));
  },
  deleteTrades: (ids) => {
    const idSet = new Set(ids);
    set({ trades: get().trades.filter((t) => !idSet.has(t.id)) });
    const userId = get().userId;
    if (userId) deleteTradeRows(userId, ids).catch(logFailure("deleteTrades"));
  },
  importTrades: (trades) => {
    set({ trades: [...get().trades, ...trades] });
    const userId = get().userId;
    if (userId) insertTrades(userId, trades).catch(logFailure("importTrades"));
  },

  addStrategy: (strategy) => {
    set({ strategies: [...get().strategies, strategy] });
    const userId = get().userId;
    if (userId) insertStrategy(userId, strategy).catch(logFailure("addStrategy"));
  },
  updateStrategy: (id, partial) => {
    let merged: Strategy | undefined;
    set({
      strategies: get().strategies.map((s) => {
        if (s.id !== id) return s;
        merged = { ...s, ...partial };
        return merged;
      }),
    });
    const userId = get().userId;
    if (userId && merged) updateStrategyRow(userId, id, merged).catch(logFailure("updateStrategy"));
  },
  deleteStrategy: (id) => {
    set({ strategies: get().strategies.filter((s) => s.id !== id) });
    const userId = get().userId;
    if (userId) deleteStrategyRow(userId, id).catch(logFailure("deleteStrategy"));
  },

  addTag: (tag) => {
    if (get().tags.includes(tag)) return;
    set({ tags: [...get().tags, tag] });
    const userId = get().userId;
    if (userId) insertTag(userId, tag).catch(logFailure("addTag"));
  },

  addCheckIn: (checkIn) => {
    set({ checkIns: [...get().checkIns, checkIn] });
    const userId = get().userId;
    if (userId) insertCheckIn(userId, checkIn).catch(logFailure("addCheckIn"));
  },
  updateCheckIn: (id, partial) => {
    let merged: DailyCheckIn | undefined;
    set({
      checkIns: get().checkIns.map((c) => {
        if (c.id !== id) return c;
        merged = { ...c, ...partial };
        return merged;
      }),
    });
    const userId = get().userId;
    if (userId && merged) updateCheckInRow(userId, id, merged).catch(logFailure("updateCheckIn"));
  },

  markNotificationRead: (id) => {
    set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    const userId = get().userId;
    if (userId) markNotificationReadRow(userId, id).catch(logFailure("markNotificationRead"));
  },
  markAllNotificationsRead: () => {
    set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) });
    const userId = get().userId;
    if (userId) markAllNotificationsReadRow(userId).catch(logFailure("markAllNotificationsRead"));
  },
  addNotification: (n) => {
    set({ notifications: [n, ...get().notifications] });
    const userId = get().userId;
    if (userId) insertNotification(userId, n).catch(logFailure("addNotification"));
  },

  refreshSubscription: async () => {
    const userId = get().userId;
    if (!userId) return;
    const subscription = await fetchSubscription(userId);
    set({ subscription });
  },
}));
