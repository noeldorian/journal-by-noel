"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileBottomNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { TradeFormModal } from "@/components/trades/trade-form-modal";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-5 md:px-6 md:py-6">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
      <CommandPalette />
      <TradeFormModal />
    </div>
  );
}
