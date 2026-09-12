"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, Plus, LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { AccountSwitcher } from "@/components/layout/account-switcher";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { DropdownMenu, MenuItem, MenuSeparator } from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { useAuth } from "@/contexts/auth-context";

function pageTitle(pathname: string) {
  const match = NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  return match?.label ?? "Journal by Noel";
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const openAddTrade = useUiStore((s) => s.openAddTrade);
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur md:px-6">
      <h1 className="text-[15px] font-semibold text-text-primary shrink-0">{pageTitle(pathname)}</h1>

      <div className="hidden md:block">
        <AccountSwitcher />
      </div>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="ml-auto hidden sm:flex items-center gap-2 rounded-md border border-border bg-surface px-3 h-9 text-[13px] text-text-tertiary hover:border-border-strong transition-colors w-56"
      >
        <Search size={14} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
          ⌘K
        </kbd>
      </button>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="sm:hidden ml-auto flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2"
      >
        <Search size={17} />
      </button>

      <NotificationsPanel />

      <Button variant="primary" size="sm" onClick={openAddTrade} className="shrink-0">
        <Plus size={15} />
        <span className="hidden sm:inline">Add Trade</span>
      </Button>

      <DropdownMenu
        trigger={
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">
            {user?.avatarInitials ?? "?"}
          </button>
        }
      >
        {(close) => (
          <>
            <div className="px-2.5 py-2">
              <p className="text-[13px] font-medium text-text-primary">{user ? `${user.firstName} ${user.lastName}` : ""}</p>
              <p className="text-[12px] text-text-tertiary">{user?.email}</p>
            </div>
            <MenuSeparator />
            <MenuItem icon={<User size={14} />} onClick={() => { router.push("/settings"); close(); }}>
              Profile
            </MenuItem>
            <MenuItem icon={<SettingsIcon size={14} />} onClick={() => { router.push("/settings"); close(); }}>
              Settings
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              danger
              icon={<LogOut size={14} />}
              onClick={() => {
                logout();
                router.push("/login");
                close();
              }}
            >
              Log out
            </MenuItem>
          </>
        )}
      </DropdownMenu>
    </header>
  );
}
