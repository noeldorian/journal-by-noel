import { NextResponse } from "next/server";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "Server is missing STRIPE_PREMIUM_PRICE_ID." }, { status: 500 });
    }

    const stripe = getStripe();
    const admin = getSupabaseAdmin();
    const { origin } = new URL(request.url);

    // Reuse an existing Stripe customer for this user if we've already
    // created one (e.g. from a previous checkout attempt they abandoned),
    // otherwise create one now and remember it.
    const { data: existing } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?section=billing&checkout=success`,
      cancel_url: `${origin}/settings?section=billing&checkout=cancelled`,
      subscription_data: { metadata: { supabase_user_id: user.id } },
      // Managed Payments (Stripe's merchant-of-record mode) is on by default
      // for new accounts and requires a tax code on every product, which we
      // have no use for here — this is a plain subscription, not a
      // marketplace sale. Opting out avoids that requirement entirely.
      managed_payments: { enabled: false },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Checkout failed" }, { status: 500 });
  }
}
