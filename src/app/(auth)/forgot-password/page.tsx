"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Always show the same "check your email" state regardless of the
    // result, so this can't be used to find out which emails have accounts.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <MailCheck size={22} />
        </div>
        <h1 className="text-[20px] font-semibold text-text-primary">Check your email</h1>
        <p className="mt-2 text-[13px] text-text-secondary">
          If an account exists for <span className="text-text-primary font-medium">{email}</span>, we&apos;ve sent a
          link to reset your password.
        </p>
        <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
          <ArrowLeft size={14} /> Back to log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} /> Back to log in
      </Link>
      <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Forgot password?</h1>
      <p className="mt-1.5 mb-6 text-[13px] text-text-secondary">
        Enter the email associated with your account and we&apos;ll send a reset link.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
          Send reset link
        </Button>
      </form>
    </div>
  );
}
