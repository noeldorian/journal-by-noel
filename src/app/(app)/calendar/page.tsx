"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, ModalHeader } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { computeAggregateStats, computeTradeMetrics } from "@/lib/calculations";
import { cn, formatCurrency, formatR, formatTime12h, pnlColorClass, toLocalDateStr } from "@/lib/utils";
import type { Trade } from "@/lib/types";

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

function CalendarContent() {
  const router = useRouter();
  const params = useSearchParams();
  const trades = useAppStore((s) => s.trades);
  const activeAccountId = useAppStore((s) => s.activeAccountId);

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(params.get("date"));

  const accountTrades = useMemo(() => trades.filter((t) => t.accountId === activeAccountId), [trades, activeAccountId]);

  const byDate = useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of accountTrades) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return map;
  }, [accountTrades]);

  const days = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const monthStats = useMemo(() => {
    const inMonth = accountTrades.filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    });
    return computeAggregateStats(inMonth);
  }, [accountTrades, cursor]);

  const selectedTrades = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Trading Calendar</h2>
          <p className="text-[13px] text-text-secondary">
            {monthStats.totalTrades} trades ·{" "}
            <span className={pnlColorClass(monthStats.netPnl)}>{formatCurrency(monthStats.netPnl)}</span> this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-surface-2">
            <ChevronLeft size={16} />
          </button>
          <p className="w-36 text-center text-[14px] font-medium text-text-primary">
            {cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-md border border-border p-1.5 text-text-secondary hover:bg-surface-2">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-3">
          <div className="grid min-w-[640px] grid-cols-8 gap-1.5">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Week"].map((d) => (
              <div key={d} className="px-1 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-text-tertiary">{d}</div>
            ))}
            {weeks.map((week, wi) => {
              const weekTrades = week.flatMap((d) => byDate.get(toLocalDateStr(d)) ?? []);
              const weekStats = computeAggregateStats(weekTrades);
              return (
                <div key={wi} className="contents">
                  {week.map((day) => {
                    const dateStr = toLocalDateStr(day);
                    const dayTrades = byDate.get(dateStr) ?? [];
                    const stats = computeAggregateStats(dayTrades);
                    const inMonth = day.getMonth() === cursor.getMonth();
                    const isToday = dateStr === toLocalDateStr(today);
                    return (
                      <button
                        key={dateStr}
                        onClick={() => dayTrades.length > 0 && setSelectedDate(dateStr)}
                        disabled={dayTrades.length === 0}
                        className={cn(
                          "flex min-h-[76px] flex-col items-start rounded-md border p-2 text-left transition-colors",
                          inMonth ? "border-border" : "border-transparent opacity-40",
                          dayTrades.length > 0 && "hover:border-border-strong cursor-pointer",
                          dayTrades.length > 0 && stats.netPnl > 0 && "bg-pos-soft/40",
                          dayTrades.length > 0 && stats.netPnl < 0 && "bg-neg-soft/40",
                          isToday && "ring-1 ring-accent/40"
                        )}
                      >
                        <span className={cn("text-[12px] font-medium", isToday ? "text-accent" : "text-text-secondary")}>{day.getDate()}</span>
                        {dayTrades.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            <p className={cn("text-[12.5px] font-semibold tabular-nums-all", pnlColorClass(stats.netPnl))}>{formatCurrency(stats.netPnl)}</p>
                            <p className="text-[10.5px] text-text-tertiary">{dayTrades.length} trade{dayTrades.length > 1 ? "s" : ""}</p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                  <div className="flex min-h-[76px] flex-col items-start justify-center rounded-md border border-border bg-bg-elevated p-2">
                    {weekTrades.length > 0 ? (
                      <>
                        <p className={cn("text-[12.5px] font-semibold tabular-nums-all", pnlColorClass(weekStats.netPnl))}>{formatCurrency(weekStats.netPnl)}</p>
                        <p className="text-[10.5px] text-text-tertiary">{weekStats.winRate.toFixed(0)}% WR · {formatR(weekStats.avgR)}</p>
                      </>
                    ) : (
                      <p className="text-[10.5px] text-text-tertiary">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Modal open={!!selectedDate} onClose={() => setSelectedDate(null)} size="md">
        <ModalHeader
          title={selectedDate ?? ""}
          subtitle={`${selectedTrades.length} trade${selectedTrades.length === 1 ? "" : "s"} · ${formatCurrency(computeAggregateStats(selectedTrades).netPnl)}`}
          onClose={() => setSelectedDate(null)}
        />
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {selectedTrades.map((t) => {
            const m = computeTradeMetrics(t);
            return (
              <button
                key={t.id}
                onClick={() => router.push(`/journal/${t.id}`)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-surface-2 transition-colors"
              >
                <Badge tone={t.direction === "Long" ? "pos" : "neg"}>{t.direction}</Badge>
                <span className="w-12 text-[13px] font-medium text-text-primary">{t.instrument}</span>
                <span className="text-[12px] text-text-tertiary">{formatTime12h(t.entryTime)}</span>
                <span className="flex-1 truncate text-[12px] text-text-tertiary">{t.setup ?? "—"}</span>
                <span className={cn("text-[13px] font-semibold tabular-nums-all", pnlColorClass(m.netPnl))}>{formatCurrency(m.netPnl)}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarContent />
    </Suspense>
  );
}
