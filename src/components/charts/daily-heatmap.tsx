"use client";

import { useMemo, useState } from "react";
import { computeTradeMetrics } from "@/lib/calculations";
import { formatCurrency, toLocalDateStr } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Trade } from "@/lib/types";

const WEEKS = 24;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

interface DayCell {
  date: string;
  netPnl: number;
  trades: number;
  inFuture: boolean;
}

export function DailyHeatmap({ trades, onSelectDate }: { trades: Trade[]; onSelectDate: (date: string) => void }) {
  const [hovered, setHovered] = useState<DayCell | null>(null);

  const { weeks, maxAbs, monthMarks } = useMemo(() => {
    const byDate = new Map<string, { netPnl: number; trades: number }>();
    for (const t of trades) {
      const m = computeTradeMetrics(t);
      const existing = byDate.get(t.date) ?? { netPnl: 0, trades: 0 };
      existing.netPnl += m.netPnl;
      existing.trades += 1;
      byDate.set(t.date, existing);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDow = today.getDay();
    const end = new Date(today);
    end.setDate(end.getDate() + (6 - todayDow));
    const start = new Date(end);
    start.setDate(start.getDate() - (WEEKS * 7 - 1));
    // Align start to a Sunday
    start.setDate(start.getDate() - start.getDay());

    const cells: DayCell[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateStr = toLocalDateStr(cursor);
      const data = byDate.get(dateStr);
      cells.push({
        date: dateStr,
        netPnl: data?.netPnl ?? 0,
        trades: data?.trades ?? 0,
        inFuture: cursor > today,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeksArr: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeksArr.push(cells.slice(i, i + 7));

    const maxAbsPnl = Math.max(1, ...cells.map((c) => Math.abs(c.netPnl)));

    const marks: { weekIndex: number; label: string }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, i) => {
      const firstDay = new Date(week[0].date + "T00:00:00");
      if (firstDay.getMonth() !== lastMonth) {
        marks.push({ weekIndex: i, label: firstDay.toLocaleDateString("en-US", { month: "short" }) });
        lastMonth = firstDay.getMonth();
      }
    });

    return { weeks: weeksArr, maxAbs: maxAbsPnl, monthMarks: marks };
  }, [trades]);

  function intensity(cell: DayCell) {
    if (cell.trades === 0) return 0;
    return Math.min(1, Math.abs(cell.netPnl) / maxAbs);
  }

  function cellColor(cell: DayCell) {
    if (cell.inFuture) return "transparent";
    if (cell.trades === 0) return "var(--surface-2)";
    const t = 0.25 + intensity(cell) * 0.75;
    return cell.netPnl >= 0 ? `color-mix(in srgb, var(--pos) ${t * 100}%, var(--surface-2))` : `color-mix(in srgb, var(--neg) ${t * 100}%, var(--surface-2))`;
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-2 min-w-max">
          <div className="flex gap-[3px] pl-6">
            {weeks.map((_, i) => {
              const mark = monthMarks.find((m) => m.weekIndex === i);
              return (
                <div key={i} className="w-[13px] shrink-0 text-[10px] text-text-tertiary">
                  {mark?.label}
                </div>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] pr-1">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="h-[13px] w-5 text-[10px] leading-[13px] text-text-tertiary">
                  {label}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell) => (
                  <button
                    key={cell.date}
                    disabled={cell.inFuture || cell.trades === 0}
                    onClick={() => onSelectDate(cell.date)}
                    onMouseEnter={() => setHovered(cell)}
                    onMouseLeave={() => setHovered((h) => (h?.date === cell.date ? null : h))}
                    className={cn(
                      "h-[13px] w-[13px] rounded-[3px] border border-black/10 transition-transform",
                      cell.trades > 0 && "hover:scale-125 hover:z-10 cursor-pointer",
                    )}
                    style={{ background: cellColor(cell) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <span>Less</span>
          <div className="flex gap-[3px]">
            {[0, 0.35, 0.6, 0.85, 1].map((t) => (
              <div key={t} className="h-[11px] w-[11px] rounded-[3px]" style={{ background: t === 0 ? "var(--surface-2)" : `color-mix(in srgb, var(--pos) ${(0.25 + t * 0.75) * 100}%, var(--surface-2))` }} />
            ))}
          </div>
          <span>More</span>
        </div>
        <div className="text-[12px] text-text-secondary min-h-[16px]">
          {hovered && hovered.trades > 0 && (
            <span>
              <span className="font-medium text-text-primary">{hovered.date}</span> · {hovered.trades} trade{hovered.trades > 1 ? "s" : ""} · {formatCurrency(hovered.netPnl)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
