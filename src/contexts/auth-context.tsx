"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/lib/store";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextValue {
  status: AuthStatus;
  email: string | null;
  emailVerified: boolean;
  signUp: (opts: { firstName: string; lastName: string; email: string; password: string }) => Promise<AuthResult>;
  login: (opts: { email: string; password: string; rememberMe?: boolean }) => Promise<AuthResult>;
  loginWithProvider: (provider: "google" | "apple") => Promise<AuthResult>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function siteUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const loadForUser = useAppStore((s) => s.loadForUser);
  const clearStore = useAppStore((s) => s.clear);

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session (if any)
    // and again on every sign-in/sign-out/token-refresh — it's the single
    // source of truth for auth state, so nothing else needs to poll.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadForUser(newSession.user.id, newSession.user.email ?? "");
        setStatus("authenticated");
      } else {
        clearStore();
        setStatus("unauthenticated");
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = useCallback(async (opts: { firstName: string; lastName: string; email: string; password: string }) => {
    const { error } = await supabase.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: {
        data: { first_name: opts.firstName, last_name: opts.lastName },
        emailRedirectTo: `${siteUrl()}/auth/callback`,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const login = useCallback(async (opts: { email: string; password: string; rememberMe?: boolean }) => {
    const { error } = await supabase.auth.signInWithPassword({ email: opts.email, password: opts.password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const loginWithProvider = useCallback(async (provider: "google" | "apple") => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${siteUrl()}/auth/callback` },
    });
    // On success this navigates the whole page away to the provider, so
    // there's nothing more to do here — control never returns to the caller.
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!session?.user?.email) return { ok: false, error: "No email on file." };
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: session.user.email,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, [session]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    email: session?.user?.email ?? null,
    emailVerified: !!session?.user?.email_confirmed_at,
    signUp,
    login,
    loginWithProvider,
    logout,
    resendVerificationEmail,
  }), [status, session, signUp, login, loginWithProvider, logout, resendVerificationEmail]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
