"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useAppStore } from "@/lib/store";
import { Logomark } from "@/components/logo";

export default function RootPage() {
  const { status } = useAuth();
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && hydrated) {
      if (user && !user.onboardingCompleted) router.replace("/onboarding");
      else router.replace("/dashboard");
    }
  }, [status, hydrated, user, router]);

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-bg">
      <Logomark className="h-9 w-9 animate-pulse" />
    </div>
  );
}
