"use client";

import { ChevronDown, Check, Wallet } from "lucide-react";
import { DropdownMenu, MenuItem, MenuSeparator } from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { formatCurrency, pnlColorClass } from "@/lib/utils";
import Link from "next/link";

export function AccountSwitcher() {
  const accounts = useAppStore((s) => s.accounts);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const setActiveAccount = useAppStore((s) => s.setActiveAccount);

  const active = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  if (!active) return null;

  const pnl = active.currentBalance - active.startingBalance;

  return (
    <DropdownMenu
      align="start"
      trigger={
        <button className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left hover:border-border-strong transition-colors">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-surface-2 text-text-secondary">
            <Wallet size={13} />
          </div>
          <div className="leading-tight">
            <p className="text-[12.5px] font-medium text-text-primary">{active.name}</p>
            <p className={`text-[11px] font-medium ${pnlColorClass(pnl)}`}>{formatCurrency(pnl)}</p>
          </div>
          <ChevronDown size={14} className="text-text-tertiary ml-1" />
        </button>
      }
    >
      {(close) => (
        <>
          <p className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
            Switch account
          </p>
          {accounts.map((a) => (
            <MenuItem
              key={a.id}
              onClick={() => {
                setActiveAccount(a.id);
                close();
              }}
              icon={a.id === active.id ? <Check size={14} className="text-accent" /> : <span className="w-3.5" />}
            >
              <span className="flex-1">{a.name}</span>
              <span className="text-text-tertiary text-[12px]">{formatCurrency(a.currentBalance, { showSign: false })}</span>
            </MenuItem>
          ))}
          <MenuSeparator />
          <Link href="/accounts" onClick={close} className="block">
            <MenuItem>Manage accounts</MenuItem>
          </Link>
        </>
      )}
    </DropdownMenu>
  );
}
