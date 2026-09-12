"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, HelpCircle } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { Logomark } from "@/components/logo";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useAppStore((s) => s.settings.sidebarCollapsed);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const user = useAppStore((s) => s.user);

  return (
    <aside
      className={cn(
        "hidden md:flex h-dvh shrink-0 flex-col border-r border-border bg-bg-elevated transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[228px]"
      )}
    >
      <div className={cn("flex items-center h-14 px-4 border-b border-border", collapsed && "justify-center px-0")}>
        {collapsed ? <Logomark className="h-7 w-7" /> : <Logomark className="h-7 w-7" />}
        {!collapsed && <span className="ml-2.5 text-[14px] font-semibold tracking-tight">Journal by Noel</span>}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
                collapsed && "justify-center px-0",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
              )}
            >
              <Icon size={17} strokeWidth={2} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2.5 space-y-0.5">
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <HelpCircle size={17} />
          {!collapsed && <span>Help</span>}
        </button>
        <Link
          href="/settings"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-surface-2 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
            {user?.avatarInitials ?? "?"}
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-medium text-text-primary">
                {user ? `${user.firstName} ${user.lastName}` : "Loading…"}
              </p>
              <p className="truncate text-[11px] text-text-tertiary">{user?.email}</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-[12px] font-medium text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
