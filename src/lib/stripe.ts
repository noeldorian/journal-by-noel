import Stripe from "stripe";

// Server-only. Never import this from a "use client" file — the secret key
// must never reach the browser. Built lazily for the same reason as the
// Supabase client: constructing it eagerly at module scope would crash the
// entire Next.js build if the env var isn't set wherever it's evaluated.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY. Set it in .env.local (dev) or your host's environment variables (production).");
  }
  cached = new Stripe(key);
  return cached;
}
