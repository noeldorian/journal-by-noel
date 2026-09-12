"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MailCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

function VerifyEmailContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const { resendVerificationEmail } = useAuth();
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleResend() {
    if (!email) {
      setError("No email on file — go back and sign up again.");
      return;
    }
    setSending(true);
    setError(null);
    const result = await resendVerificationEmail(email);
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "Couldn't resend — try again in a moment.");
      return;
    }
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <MailCheck size={22} />
      </div>
      <h1 className="text-[20px] font-semibold text-text-primary">Verify your email</h1>
      <p className="mt-2 text-[13px] text-text-secondary">
        We sent a verification link to{" "}
        <span className="font-medium text-text-primary">{email || "your email"}</span>. Click the link
        to activate your account — this page will move on automatically once you do.
      </p>

      {error && (
        <div className="mt-5 flex items-center gap-2 rounded-md border border-neg/30 bg-neg-soft px-3 py-2.5 text-left text-[13px] text-neg">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={sending}
        className="mt-6 text-[13px] font-medium text-accent hover:underline disabled:opacity-50"
      >
        {resent ? "Verification email resent" : sending ? "Sending…" : "Resend verification email"}
      </button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
