"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useAppStore } from "@/lib/store";
import { Logomark } from "@/components/logo";

function FullScreenLoader() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-3">
        <Logomark className="h-9 w-9 animate-pulse" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-1/3 animate-[loading_1.1s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
      </div>
      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}

export function RequireAuth({
  children,
  requireOnboarded = true,
}: {
  children: React.ReactNode;
  requireOnboarded?: boolean;
}) {
  const { status } = useAuth();
  const user = useAppStore((s) => s.user);
  const hydrated = useAppStore((s) => s.hydrated);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && hydrated && requireOnboarded && user && !user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [status, hydrated, requireOnboarded, user, router]);

  if (status !== "authenticated" || !hydrated || !user) {
    return <FullScreenLoader />;
  }

  if (requireOnboarded && !user.onboardingCompleted) {
    return <FullScreenLoader />;
  }

  return <>{children}</>;
}
