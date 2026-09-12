"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, AlertCircle, KeyRound } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { PASSWORD_RULES } from "@/lib/password-rules";
import { cn } from "@/lib/utils";

// Deliberately NOT under app/(auth) — that group redirects signed-in users
// away, but the password-recovery link Supabase sends signs the user in
// (into a recovery session) before they ever reach this page.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!allRulesPass) return setError("Please meet all password requirements.");
    if (!passwordsMatch) return setError("Passwords do not match.");

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <AuthSplitLayout>
      {done ? (
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Check size={22} />
          </div>
          <h1 className="text-[20px] font-semibold text-text-primary">Password updated</h1>
          <p className="mt-2 text-[13px] text-text-secondary">Taking you to your dashboard…</p>
        </div>
      ) : (
        <div>
          <div className="mb-7">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
              <KeyRound size={20} />
            </div>
            <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Set a new password</h1>
            <p className="mt-1.5 text-[13px] text-text-secondary">Choose a new password for your account.</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-neg/30 bg-neg-soft px-3 py-2.5 text-[13px] text-neg">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" />
              <div className="mt-2.5 grid grid-cols-1 gap-1.5 rounded-md border border-border bg-bg-elevated p-3 sm:grid-cols-2">
                {PASSWORD_RULES.map((rule) => {
                  const pass = rule.test(password);
                  return (
                    <div key={rule.id} className="flex items-center gap-1.5 text-[12px]">
                      {pass ? <Check size={13} className="text-pos" /> : <X size={13} className="text-text-tertiary" />}
                      <span className={cn(pass ? "text-text-secondary" : "text-text-tertiary")}>{rule.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                invalid={confirmPassword.length > 0 && !passwordsMatch}
              />
            </div>
            <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
              Update password
            </Button>
          </form>
        </div>
      )}
    </AuthSplitLayout>
  );
}
