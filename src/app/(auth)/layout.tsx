"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  return (
    <ToastProvider>
      <AuthSplitLayout>{children}</AuthSplitLayout>
    </ToastProvider>
  );
}
