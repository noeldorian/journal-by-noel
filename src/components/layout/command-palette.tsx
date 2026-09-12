"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search, Plus, LayoutDashboard, BarChart3, CalendarDays, ListChecks,
  Wallet, BookText, TrendingUp, ArrowRight,
} from "lucide-react";
import { useUiStore } from "@/lib/ui-store";
import { useAppStore } from "@/lib/store";
import { computeTradeMetrics } from "@/lib/calculations";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  group: "Actions" | "Navigate" | "Trades" | "Strategies" | "Tags";
  icon: React.ReactNode;
  keywords?: string;
  action: () => void;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  // Mounting this fresh each time the palette opens means its query and
  // selection state always start clean, with no reset effect required.
  return <PaletteContent onClose={() => setOpen(false)} />;
}

function PaletteContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const openAddTrade = useUiStore((s) => s.openAddTrade);
  const trades = useAppStore((s) => s.trades);
  const strategies = useAppStore((s) => s.strategies);
  const tags = useAppStore((s) => s.tags);
  const accounts = useAppStore((s) => s.accounts);
  const setActiveAccount = useAppStore((s) => s.setActiveAccount);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const nav = (label: string, href: string, icon: React.ReactNode): Command => ({
      id: `nav-${href}`,
      label: `Open ${label}`,
      group: "Navigate",
      icon,
      action: () => router.push(href),
    });

    const base: Command[] = [
      { id: "add-trade", label: "Add Trade", group: "Actions", icon: <Plus size={15} />, action: openAddTrade },
      nav("Dashboard", "/dashboard", <LayoutDashboard size={15} />),
      nav("Journal", "/journal", <BookText size={15} />),
      nav("Analytics", "/analytics", <BarChart3 size={15} />),
      nav("Calendar", "/calendar", <CalendarDays size={15} />),
      nav("Playbook", "/playbook", <ListChecks size={15} />),
      nav("Accounts", "/accounts", <Wallet size={15} />),
      {
        id: "create-strategy",
        label: "Create Strategy",
        group: "Actions",
        icon: <ListChecks size={15} />,
        action: () => router.push("/playbook?new=1"),
      },
      {
        id: "export-data",
        label: "Export Data",
        group: "Actions",
        icon: <ArrowRight size={15} />,
        action: () => router.push("/journal?export=1"),
      },
      ...accounts.map((a) => ({
        id: `switch-${a.id}`,
        label: `Switch to ${a.name}`,
        group: "Actions" as const,
        icon: <Wallet size={15} />,
        keywords: "switch account",
        action: () => setActiveAccount(a.id),
      })),
      ...strategies.map((s) => ({
        id: `strategy-${s.id}`,
        label: s.name,
        group: "Strategies" as const,
        icon: <ListChecks size={15} />,
        action: () => router.push(`/playbook/${s.id}`),
      })),
      ...Array.from(new Set(tags)).map((t) => ({
        id: `tag-${t}`,
        label: `Tag: ${t}`,
        group: "Tags" as const,
        icon: <TrendingUp size={15} />,
        action: () => router.push(`/journal?tag=${encodeURIComponent(t)}`),
      })),
      ...[...trades]
        .sort((a, b) => (b.date + b.entryTime).localeCompare(a.date + a.entryTime))
        .slice(0, 40)
        .map((t) => {
          const m = computeTradeMetrics(t);
          return {
            id: `trade-${t.id}`,
            label: `${t.instrument} ${t.direction} · ${formatDate(t.date)} · ${formatCurrency(m.netPnl)}`,
            group: "Trades" as const,
            icon: <BookText size={15} />,
            keywords: `${t.instrument} ${t.setup ?? ""} ${t.tags.join(" ")}`,
            action: () => router.push(`/journal/${t.id}`),
          };
        }),
    ];
    return base;
  }, [router, openAddTrade, accounts, strategies, tags, trades, setActiveAccount]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands.filter((c) => c.group === "Actions" || c.group === "Navigate");
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.keywords?.toLowerCase().includes(q)).slice(0, 60);
  }, [commands, query]);

  const groups = ["Actions", "Navigate", "Trades", "Strategies", "Tags"] as const;

  function handleQueryChange(value: string) {
    setQuery(value);
    setActiveIndex(0);
  }

  function run(cmd: Command) {
    cmd.action();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4">
      <div className="fixed inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-modal)] animate-slide-up"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
          if (e.key === "Enter" && filtered[activeIndex]) { e.preventDefault(); run(filtered[activeIndex]); }
        }}
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search size={16} className="text-text-tertiary" />
          <input
            ref={(el) => el?.focus()}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search trades, strategies, tags, or type a command…"
            className="h-12 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
          />
          <kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-tertiary">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-[13px] text-text-tertiary">No results for &ldquo;{query}&rdquo;</p>
          )}
          {groups.map((group) => {
            const items = filtered.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{group}</p>
                {items.map((cmd) => {
                  const globalIndex = filtered.indexOf(cmd);
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => run(cmd)}
                      onMouseEnter={() => setActiveIndex(globalIndex)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                        globalIndex === activeIndex ? "bg-surface-2 text-text-primary" : "text-text-secondary"
                      )}
                    >
                      <span className="text-text-tertiary">{cmd.icon}</span>
                      <span className="flex-1 truncate">{cmd.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
