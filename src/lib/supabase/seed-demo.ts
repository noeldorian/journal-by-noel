// Optional, user-triggered seeding (Settings → Data → "Load sample data").
// Real signups start empty by design — this just lets someone populate their
// own account with the same realistic fictional dataset used to build the
// UI, so they can explore analytics/calendar/playbook before journaling for
// real.
import { generateDemoDatabase } from "@/lib/demo-data";
import { useAppStore } from "@/lib/store";
import type { UserProfile } from "@/lib/types";
import { insertAccount, insertCheckIn, insertStrategy, insertTag, insertTrades } from "./queries";

export async function seedDemoDataForCurrentUser(user: UserProfile) {
  const demo = generateDemoDatabase();

  for (const account of demo.accounts) {
    await insertAccount(user.id, account);
  }
  for (const strategy of demo.strategies) {
    await insertStrategy(user.id, strategy);
  }
  await insertTrades(user.id, demo.trades);
  for (const checkIn of demo.checkIns) {
    await insertCheckIn(user.id, checkIn);
  }
  for (const tag of demo.tags) {
    await insertTag(user.id, tag);
  }

  await useAppStore.getState().loadForUser(user.id, user.email);
}
