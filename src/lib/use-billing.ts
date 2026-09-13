"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

async function callBillingRoute(path: "/api/stripe/checkout" | "/api/stripe/portal") {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const res = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body.url as string;
}

// Both actions redirect the whole page to Stripe's hosted UI (Checkout or
// the Billing Portal) — there's no in-app payment form, so no card data
// ever touches this app's code.
export function useBilling() {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading("checkout");
    setError(null);
    try {
      const url = await callBillingRoute("/api/stripe/checkout");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError(null);
    try {
      const url = await callBillingRoute("/api/stripe/portal");
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open billing portal.");
      setLoading(null);
    }
  }

  return { startCheckout, openPortal, loading, error };
}
