"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { PASSWORD_RULES } from "@/lib/password-rules";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (!allRulesPass) {
      setError("Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await signUp({ firstName, lastName, email, password });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Create your account</h1>
        <p className="mt-1.5 text-[13px] text-text-secondary">Start journaling your futures trades in minutes.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-neg/30 bg-neg-soft px-3 py-2.5 text-[13px] text-neg">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Alex" />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Morgan" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setTouched(true)}
              placeholder="Create a password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {touched && (
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
          )}
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            invalid={confirmPassword.length > 0 && !passwordsMatch}
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-7 text-center text-[13px] text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>

      <p className="mt-4 text-center text-[11.5px] text-text-tertiary">
        By creating an account, you agree to our{" "}
        <a href="#" className="underline hover:text-text-secondary">Terms of Service</a> and{" "}
        <a href="#" className="underline hover:text-text-secondary">Privacy Policy</a>. We never ask for
        broker or exchange passwords.
      </p>
    </div>
  );
}
