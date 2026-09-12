"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 014.9 12c0-.79.14-1.56.37-2.28V6.63H1.29A11.98 11.98 0 000 12c0 1.94.46 3.77 1.29 5.37l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.475 2.24-1.25 3.02-.83.85-2.15 1.5-3.22 1.42-.14-1.1.47-2.24 1.24-3 .84-.83 2.24-1.44 3.23-1.44zM20.5 17.3c-.5 1.15-1.1 2.28-2.02 3.35-.86 1-1.86 2.05-3.2 2.05-1.28 0-1.7-.78-3.15-.78-1.47 0-1.94.76-3.15.8-1.3.05-2.3-1.08-3.17-2.08-1.75-2.02-3.1-5.7-1.3-8.2.9-1.25 2.5-2.03 4.26-2.06 1.24-.02 2.4.83 3.15.83.75 0 2.16-1.03 3.65-.88.62.03 2.37.25 3.5 1.9-.09.06-2.09 1.22-2.07 3.64.02 2.88 2.53 3.84 2.56 3.85z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithProvider } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login({ email, password, rememberMe });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.push("/dashboard");
  }

  async function handleOAuth(provider: "google" | "apple") {
    setOauthLoading(provider);
    const result = await loginWithProvider(provider);
    // On success the page navigates away to the provider entirely, so this
    // only ever runs when something went wrong before the redirect.
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setOauthLoading(null);
    }
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">Welcome back</h1>
        <p className="mt-1.5 text-[13px] text-text-secondary">Log in to your trading journal.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-neg/30 bg-neg-soft px-3 py-2.5 text-[13px] text-neg">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-[12.5px] font-medium text-accent hover:underline mb-1.5">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} />
          <span className="text-[13px] text-text-secondary">Remember me for 30 days</span>
        </label>

        <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
          Log in
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[12px] text-text-tertiary">or continue with</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" size="lg" onClick={() => handleOAuth("google")} loading={oauthLoading === "google"}>
          <GoogleIcon /> Google
        </Button>
        <Button variant="secondary" size="lg" onClick={() => handleOAuth("apple")} loading={oauthLoading === "apple"}>
          <AppleIcon /> Apple
        </Button>
      </div>

      <p className="mt-7 text-center text-[13px] text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create account
        </Link>
      </p>

      <p className="mt-4 text-center text-[11.5px] text-text-tertiary">
        By continuing, you agree to our{" "}
        <a href="#" className="underline hover:text-text-secondary">Terms of Service</a> and{" "}
        <a href="#" className="underline hover:text-text-secondary">Privacy Policy</a>.
      </p>
    </div>
  );
}
