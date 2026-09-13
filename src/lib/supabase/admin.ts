import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only admin client using the service-role key, which bypasses RLS
// entirely. Never import this from a "use client" file.
//
// Typed explicitly as `SupabaseClient` (rather than via `ReturnType<typeof
// createClient>`) — inferring the return type of a generic function that
// way instantiates its type parameters oddly and infers table rows as
// `never` instead of the intended loosely-typed default.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  cached = createSupabaseClient(url, serviceRoleKey);
  return cached;
}

// Resolves the calling user from the `Authorization: Bearer <access_token>`
// header of an incoming request — used by API routes that need to act on
// "whoever is making this request", never on an id the client just hands us.
export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace("Bearer ", "");
  if (!accessToken) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}
