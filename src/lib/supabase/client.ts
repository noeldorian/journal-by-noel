import { createBrowserClient } from "@supabase/ssr";

// A single browser-side Supabase client, reused across the app. It reads the
// session from localStorage/cookies itself, so there's no manual token
// bookkeeping to do — auth.onAuthStateChange (wired up in AuthProvider) is
// the source of truth for "am I logged in".
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const supabase = createClient();
