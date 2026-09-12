"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const PRIMARY_MOBILE = NAV_ITEMS.slice(0, 4);

export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t border-border bg-bg-elevated/95 backdrop-blur">
        {PRIMARY_MOBILE.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                active ? "text-accent" : "text-text-tertiary"
              )}
            >
              <Icon size={19} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-text-tertiary"
        >
          <Menu size={19} />
          More
        </button>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 animate-fade-in" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-xl border-t border-border bg-surface p-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3">
              <Logo />
              <button onClick={() => setOpen(false)} className="text-text-tertiary">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-surface-2 py-3 text-[12px] font-medium text-text-secondary"
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
