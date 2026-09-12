import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Only used by the /auth/callback route handler, which needs to exchange a
// PKCE code for a session and write the resulting auth cookies — everything
// else in this app talks to Supabase from the browser client instead.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render rather than a Route
            // Handler/Server Action — cookies can't be set there, which is
            // fine as long as middleware is refreshing the session.
          }
        },
      },
    }
  );
}
