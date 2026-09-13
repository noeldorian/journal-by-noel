import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/admin";
import { REWARD_POINTS_PER_GOOD_DAY } from "@/lib/types";

// Awards points for a disciplined trading day. The client tells us which
// check-in to look at, but never the verdict — we re-read the check-in
// ourselves with the service-role key and decide from there, the same way
// the Stripe webhook is the only thing allowed to write subscription
// status. A partial unique index on (user_id, date) where reason =
// 'good_day' makes a second award for the same day fail quietly (23505)
// rather than double-pay — this route doesn't need to get that right on
// its own.
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { checkInId } = (await request.json()) as { checkInId?: string };
    if (!checkInId) return NextResponse.json({ error: "Missing checkInId" }, { status: 400 });

    const admin = getSupabaseAdmin();

    const { data: checkIn, error: checkInErr } = await admin
      .from("check_ins")
      .select("*")
      .eq("id", checkInId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (checkInErr) throw checkInErr;
    if (!checkIn) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });

    const qualifies =
      checkIn.type === "post" &&
      checkIn.followed_plan === true &&
      checkIn.overtraded === false &&
      checkIn.revenge_traded === false &&
      checkIn.respected_risk === true;

    if (!qualifies) return NextResponse.json({ awarded: false });

    const { error: insertErr } = await admin.from("reward_point_events").insert({
      id: `rpe_${checkIn.id}`,
      user_id: user.id,
      date: checkIn.date,
      points: REWARD_POINTS_PER_GOOD_DAY,
      reason: "good_day",
    });
    if (insertErr) {
      if (insertErr.code === "23505") return NextResponse.json({ awarded: false, alreadyAwarded: true });
      throw insertErr;
    }

    const { data: current } = await admin.from("reward_points").select("*").eq("user_id", user.id).maybeSingle();
    const balance = (current?.balance ?? 0) + REWARD_POINTS_PER_GOOD_DAY;
    const lifetimeEarned = (current?.lifetime_earned ?? 0) + REWARD_POINTS_PER_GOOD_DAY;

    const { error: upsertErr } = await admin
      .from("reward_points")
      .upsert({ user_id: user.id, balance, lifetime_earned: lifetimeEarned, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (upsertErr) throw upsertErr;

    return NextResponse.json({ awarded: true, points: REWARD_POINTS_PER_GOOD_DAY, balance });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to award points" }, { status: 500 });
  }
}
