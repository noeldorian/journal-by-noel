import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

// Stripe calls this endpoint directly (no user session involved) whenever a
// subscription changes — it's the ONLY place subscription status ever gets
// written, which is why the `subscriptions` table's RLS policy is read-only
// for regular users: this route uses the service-role key to bypass it.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Server is missing STRIPE_WEBHOOK_SECRET." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  async function resolveUserId(customerId: string, metadataUserId?: string | null) {
    if (metadataUserId) return metadataUserId;
    const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    return (data?.user_id as string) ?? null;
  }

  async function upsertFromSubscription(subscription: Stripe.Subscription, userIdHint?: string | null) {
    const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
    const userId = await resolveUserId(customerId, userIdHint ?? subscription.metadata?.supabase_user_id);
    if (!userId) {
      console.error("[stripe webhook] couldn't resolve a user for customer", customerId);
      return;
    }
    const item = subscription.items.data[0];
    await admin.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        price_id: item?.price.id ?? null,
        current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const stripe = getStripe();
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription, session.client_reference_id);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        await upsertFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        const userId = await resolveUserId(customerId, subscription.metadata?.supabase_user_id);
        if (userId) {
          await admin.from("subscriptions").upsert(
            { user_id: userId, status: "canceled", cancel_at_period_end: false, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
