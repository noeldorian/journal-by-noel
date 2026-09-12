import { createBrowserClient } from "@supabase/ssr";

// A single browser-side Supabase client, reused across the app. It reads the
// session from localStorage/cookies itself, so there's no manual token
// bookkeeping to do — auth.onAuthStateChange (wired up in AuthProvider) is
// the source of truth for "am I logged in".
//
// Built lazily (on first real use) rather than at module scope: Next.js
// evaluates client-component modules in Node during the build (to prerender
// pages), so an eager `createBrowserClient(...)` here would throw and take
// the ENTIRE build down the moment an env var is missing or malformed —
// instead of failing loudly and specifically only where Supabase is
// actually used.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set them in .env.local (local dev) or your host's environment variables (production)."
    );
  }
  return createBrowserClient(url, anonKey);
}

let cached: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!cached) cached = createClient();
  return cached;
}

// Proxy so existing `supabase.auth.foo()` / `supabase.from(...)` call sites
// don't need to change, but the real client still isn't constructed until
// the first property access at runtime.
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseClient();
    return client[prop as keyof typeof client];
  },
});
