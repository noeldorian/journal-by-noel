"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Trash2, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { computeTradeMetrics } from "@/lib/calculations";
import { formatCurrency, formatDate, formatR, formatTime12h, pnlColorClass, cn } from "@/lib/utils";
import type { Trade } from "@/lib/types";

type SortKey = "date" | "instrument" | "pnl" | "r" | "risk";

const OPTIONAL_COLUMNS = [
  { key: "session", label: "Session" },
  { key: "setup", label: "Setup" },
  { key: "risk", label: "Risk" },
  { key: "contracts", label: "Contracts" },
  { key: "tags", label: "Tags" },
] as const;
type OptionalColumn = (typeof OPTIONAL_COLUMNS)[number]["key"];

const PAGE_SIZE = 15;

function SortHeader({ label, k, sortKey, onSort }: { label: string; k: SortKey; sortKey: SortKey; onSort: (k: SortKey) => void }) {
  return (
    <button onClick={() => onSort(k)} className="flex items-center gap-1 hover:text-text-primary">
      {label} <ArrowUpDown size={11} className={sortKey === k ? "text-accent" : "text-text-tertiary"} />
    </button>
  );
}

export function TradeTable({
  trades,
  onOpenTrade,
  onDeleteTrades,
}: {
  trades: Trade[];
  onOpenTrade: (id: string) => void;
  onDeleteTrades: (ids: string[]) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<OptionalColumn>>(new Set(["session", "setup", "risk"]));

  const sorted = useMemo(() => {
    const withMetrics = trades.map((t) => ({ trade: t, metrics: computeTradeMetrics(t) }));
    withMetrics.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = (a.trade.date + a.trade.entryTime).localeCompare(b.trade.date + b.trade.entryTime);
      else if (sortKey === "instrument") cmp = a.trade.instrument.localeCompare(b.trade.instrument);
      else if (sortKey === "pnl") cmp = a.metrics.netPnl - b.metrics.netPnl;
      else if (sortKey === "r") cmp = a.metrics.rMultiple - b.metrics.rMultiple;
      else if (sortKey === "risk") cmp = a.metrics.riskAmount - b.metrics.riskAmount;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withMetrics;
  }, [trades, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  function toggleSelectAll() {
    if (selected.size === pageItems.length) setSelected(new Set());
    else setSelected(new Set(pageItems.map((p) => p.trade.id)));
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleColumn(key: OptionalColumn) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function handleBulkDelete() {
    if (selected.size === 0) return;
    if (confirm(`Delete ${selected.size} trade${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) {
      onDeleteTrades(Array.from(selected));
      setSelected(new Set());
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[12.5px] text-text-secondary">
          {selected.size > 0 ? (
            <div className="flex items-center gap-2">
              <span>{selected.size} selected</span>
              <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 size={13} /> Delete</Button>
            </div>
          ) : (
            <span>{trades.length} trades</span>
          )}
        </div>
        <DropdownMenu
          trigger={
            <Button variant="tertiary" size="sm"><SlidersHorizontal size={13} /> Columns</Button>
          }
        >
          {() => (
            <>
              {OPTIONAL_COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-text-primary hover:bg-surface-2 cursor-pointer">
                  <Checkbox checked={visibleCols.has(c.key)} onCheckedChange={() => toggleColumn(c.key)} />
                  {c.label}
                </label>
              ))}
            </>
          )}
        </DropdownMenu>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-[13px]">
          <thead className="bg-surface-2 text-text-tertiary text-[11.5px] uppercase tracking-wide">
            <tr>
              <th className="w-9 px-3 py-2.5"><Checkbox checked={selected.size > 0 && selected.size === pageItems.length} onCheckedChange={toggleSelectAll} /></th>
              <th className="px-3 py-2.5 text-left"><SortHeader label="Date" k="date" sortKey={sortKey} onSort={toggleSort} /></th>
              <th className="px-3 py-2.5 text-left"><SortHeader label="Instrument" k="instrument" sortKey={sortKey} onSort={toggleSort} /></th>
              <th className="px-3 py-2.5 text-left">Direction</th>
              {visibleCols.has("contracts") && <th className="px-3 py-2.5 text-right">Contracts</th>}
              <th className="px-3 py-2.5 text-right">Gross P&L</th>
              {visibleCols.has("risk") && <th className="px-3 py-2.5 text-right"><SortHeader label="Risk" k="risk" sortKey={sortKey} onSort={toggleSort} /></th>}
              <th className="px-3 py-2.5 text-right"><SortHeader label="Net P&L" k="pnl" sortKey={sortKey} onSort={toggleSort} /></th>
              <th className="px-3 py-2.5 text-right"><SortHeader label="R" k="r" sortKey={sortKey} onSort={toggleSort} /></th>
              {visibleCols.has("setup") && <th className="px-3 py-2.5 text-left">Setup</th>}
              {visibleCols.has("session") && <th className="px-3 py-2.5 text-left">Session</th>}
              <th className="px-3 py-2.5 text-left">Result</th>
              {visibleCols.has("tags") && <th className="px-3 py-2.5 text-left">Tags</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageItems.map(({ trade, metrics }) => (
              <tr
                key={trade.id}
                className="hover:bg-surface-2 transition-colors cursor-pointer"
                onClick={() => onOpenTrade(trade.id)}
              >
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={selected.has(trade.id)} onCheckedChange={() => toggleSelect(trade.id)} />
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap text-text-secondary">
                  {formatDate(trade.date)} <span className="text-text-tertiary">{formatTime12h(trade.entryTime)}</span>
                </td>
                <td className="px-3 py-2.5 font-medium text-text-primary">{trade.instrument}</td>
                <td className="px-3 py-2.5"><Badge tone={trade.direction === "Long" ? "pos" : "neg"}>{trade.direction}</Badge></td>
                {visibleCols.has("contracts") && <td className="px-3 py-2.5 text-right tabular-nums-all text-text-secondary">{trade.contracts}</td>}
                <td className={cn("px-3 py-2.5 text-right tabular-nums-all", pnlColorClass(metrics.grossPnl))}>{formatCurrency(metrics.grossPnl)}</td>
                {visibleCols.has("risk") && <td className="px-3 py-2.5 text-right tabular-nums-all text-text-secondary">{trade.stopLoss !== undefined ? formatCurrency(metrics.riskAmount, { showSign: false }) : "—"}</td>}
                <td className={cn("px-3 py-2.5 text-right font-semibold tabular-nums-all", pnlColorClass(metrics.netPnl))}>{formatCurrency(metrics.netPnl)}</td>
                <td className={cn("px-3 py-2.5 text-right tabular-nums-all", pnlColorClass(metrics.rMultiple))}>{trade.stopLoss !== undefined ? formatR(metrics.rMultiple) : "—"}</td>
                {visibleCols.has("setup") && <td className="px-3 py-2.5 text-text-secondary max-w-[140px] truncate">{trade.setup ?? "—"}</td>}
                {visibleCols.has("session") && <td className="px-3 py-2.5 text-text-secondary">{trade.session}</td>}
                <td className="px-3 py-2.5">
                  <Badge tone={metrics.result === "Win" ? "pos" : metrics.result === "Loss" ? "neg" : "neutral"}>{metrics.result}</Badge>
                </td>
                {visibleCols.has("tags") && (
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {trade.tags.slice(0, 2).map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
                      {trade.tags.length > 2 && <span className="text-text-tertiary text-[11px]">+{trade.tags.length - 2}</span>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2.5">
        {pageItems.map(({ trade, metrics }) => (
          <button
            key={trade.id}
            onClick={() => onOpenTrade(trade.id)}
            className="w-full rounded-lg border border-border bg-surface p-3.5 text-left active:bg-surface-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-text-primary">{trade.instrument}</span>
                <Badge tone={trade.direction === "Long" ? "pos" : "neg"}>{trade.direction}</Badge>
              </div>
              <span className={cn("text-[14px] font-semibold tabular-nums-all", pnlColorClass(metrics.netPnl))}>{formatCurrency(metrics.netPnl)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px] text-text-tertiary">
              <span>{formatDate(trade.date)} · {formatTime12h(trade.entryTime)}</span>
              <span className={pnlColorClass(metrics.rMultiple)}>{formatR(metrics.rMultiple)}</span>
            </div>
            {trade.setup && <p className="mt-1.5 text-[12px] text-text-secondary truncate">{trade.setup}</p>}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? null : (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12.5px] text-text-tertiary">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="tertiary" size="icon" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft size={15} />
            </Button>
            <Button variant="tertiary" size="icon" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
