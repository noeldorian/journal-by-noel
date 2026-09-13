import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data } = await admin.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    const customerId = data?.stripe_customer_id as string | undefined;
    if (!customerId) {
      return NextResponse.json({ error: "No billing account yet — subscribe first." }, { status: 400 });
    }

    const stripe = getStripe();
    const { origin } = new URL(request.url);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings?section=billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't open billing portal" }, { status: 500 });
  }
}
