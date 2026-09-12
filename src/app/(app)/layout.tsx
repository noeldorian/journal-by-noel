"use client";

import { RequireAuth } from "@/components/auth-gate";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <RequireAuth>
        <AppShell>{children}</AppShell>
      </RequireAuth>
    </ToastProvider>
  );
}
