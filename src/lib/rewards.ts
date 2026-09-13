"use client";

import { supabase } from "@/lib/supabase/client";

async function callRewardsRoute<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
  return json as T;
}

export function awardPointsForCheckIn(checkInId: string) {
  return callRewardsRoute<{ awarded: boolean; alreadyAwarded?: boolean; points?: number; balance?: number }>(
    "/api/rewards/award-for-checkin",
    { checkInId }
  );
}

export function redeemRewardPoints() {
  return callRewardsRoute<{ ok: boolean; balance: number; premiumUntil: string }>("/api/rewards/redeem");
}
