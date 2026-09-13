import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/admin";
import { REWARD_POINTS_REDEMPTION_COST } from "@/lib/types";

const PREMIUM_DAYS = 30;

// Spends 500 points for 30 days of Premium — stacked onto whatever's left
// of a real subscription if one is currently active, rather than cutting
// it short. Uses the service-role key for the same reason the Stripe
// webhook does: nothing about "am I Premium" is ever writable by the
// signed-in user's own client.
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const admin = getSupabaseAdmin();

    const { data: points, error: pointsErr } = await admin.from("reward_points").select("*").eq("user_id", user.id).maybeSingle();
    if (pointsErr) throw pointsErr;
    const balance = points?.balance ?? 0;
    if (balance < REWARD_POINTS_REDEMPTION_COST) {
      return NextResponse.json(
        { error: `You need ${REWARD_POINTS_REDEMPTION_COST} points to redeem — you have ${balance}.` },
        { status: 400 }
      );
    }

    const { data: sub, error: subErr } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
    if (subErr) throw subErr;

    const now = new Date();
    const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end as string) : now;
    const base = currentEnd > now ? currentEnd : now;
    const newEnd = new Date(base.getTime() + PREMIUM_DAYS * 86_400_000);

    const { error: subUpsertErr } = await admin.from("subscriptions").upsert(
      { user_id: user.id, status: "active", current_period_end: newEnd.toISOString(), cancel_at_period_end: false },
      { onConflict: "user_id" }
    );
    if (subUpsertErr) throw subUpsertErr;

    const nextBalance = balance - REWARD_POINTS_REDEMPTION_COST;
    const { error: balanceErr } = await admin
      .from("reward_points")
      .update({ balance: nextBalance, updated_at: now.toISOString() })
      .eq("user_id", user.id);
    if (balanceErr) throw balanceErr;

    const { error: eventErr } = await admin.from("reward_point_events").insert({
      id: `rpe_redeem_${user.id}_${now.getTime()}`,
      user_id: user.id,
      date: now.toISOString().slice(0, 10),
      points: -REWARD_POINTS_REDEMPTION_COST,
      reason: "redeem_premium",
    });
    if (eventErr) throw eventErr;

    return NextResponse.json({ ok: true, balance: nextBalance, premiumUntil: newEnd.toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Redemption failed" }, { status: 500 });
  }
}
