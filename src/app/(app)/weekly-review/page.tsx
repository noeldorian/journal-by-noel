"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label, Textarea } from "@/components/ui/input";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { computeWeekStats, mondayOf, traderArchetype, weekRangeLabel, MOOD_OPTIONS } from "@/lib/weekly-review";
import { formatCurrency, formatPercent, pnlColorClass, toLocalDateStr, todayLocalDateStr, uid } from "@/lib/utils";

export default function WeeklyReviewPage() {
  const trades = useAppStore((s) => s.trades);
  const checkIns = useAppStore((s) => s.checkIns);
  const weeklyReviews = useAppStore((s) => s.weeklyReviews);
  const saveWeeklyReview = useAppStore((s) => s.saveWeeklyReview);
  const { push } = useToast();

  const thisWeekStart = useMemo(() => mondayOf(todayLocalDateStr()), []);
  const [weekStart, setWeekStart] = useState(thisWeekStart);

  const existing = weeklyReviews.find((w) => w.weekStart === weekStart) ?? null;
  const stats = useMemo(() => computeWeekStats(trades, checkIns, weekStart), [trades, checkIns, weekStart]);
  const archetype = useMemo(() => traderArchetype(stats), [stats]);

  const [mood, setMood] = useState(existing?.mood ?? "");
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [toImprove, setToImprove] = useState(existing?.toImprove ?? "");
  const [nextWeekFocus, setNextWeekFocus] = useState(existing?.nextWeekFocus ?? "");

  const isCurrentWeek = weekStart === thisWeekStart;
  const isSunday = new Date(todayLocalDateStr() + "T00:00:00").getDay() === 0;

  function goToWeek(next: string) {
    setWeekStart(next);
    const nextExisting = weeklyReviews.find((w) => w.weekStart === next) ?? null;
    setMood(nextExisting?.mood ?? "");
    setWentWell(nextExisting?.wentWell ?? "");
    setToImprove(nextExisting?.toImprove ?? "");
    setNextWeekFocus(nextExisting?.nextWeekFocus ?? "");
  }

  function shiftWeek(days: number) {
    // toLocalDateStr, not toISOString — the latter converts to UTC first,
    // which silently rolls the date back (or forward) a day for anyone
    // outside UTC and made this a no-op in some timezones.
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + days);
    goToWeek(mondayOf(toLocalDateStr(d)));
  }

  function handleSave() {
    const now = new Date().toISOString();
    saveWeeklyReview({
      id: existing?.id ?? uid("review"),
      weekStart,
      mood: mood || undefined,
      wentWell: wentWell || undefined,
      toImprove: toImprove || undefined,
      nextWeekFocus: nextWeekFocus || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
    push({ title: "Review saved", description: "See you next week 👋", tone: "success" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Sunday Review</h2>
          <p className="text-[13px] text-text-secondary">
            {isCurrentWeek && isSunday
              ? "It's Sunday — take five minutes to look back before next week starts."
              : "Recap the week, then set your intention for the next one."}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="tertiary" size="icon" onClick={() => shiftWeek(-7)}><ChevronLeft size={15} /></Button>
          <span className="min-w-[150px] text-center text-[13px] font-medium text-text-secondary">{weekRangeLabel(weekStart)}</span>
          <Button variant="tertiary" size="icon" disabled={isCurrentWeek} onClick={() => shiftWeek(7)}><ChevronRight size={15} /></Button>
        </div>
      </div>

      {/* Trader archetype of the week — the fun, shareable-feeling headline */}
      <Card className="overflow-hidden">
        <CardContent className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[28px]">
            {archetype.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[15px] font-semibold text-text-primary">{archetype.name}</p>
              <Badge tone="accent">{isCurrentWeek ? "This week" : "That week"}</Badge>
            </div>
            <p className="mt-0.5 text-[13px] text-text-secondary">{archetype.blurb}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <Stat label="Net P&L" value={stats.netPnl} format={(v) => formatCurrency(v)} className={pnlColorClass(stats.netPnl)} />
        <Stat label="Win rate" value={stats.tradeCount ? stats.winRate : 0} format={(v) => (stats.tradeCount ? formatPercent(v) : "—")} />
        <Stat label="Trades logged" value={stats.tradeCount} format={(v) => v.toFixed(0)} />
        <Stat label="Discipline days" value={stats.disciplineDays} format={(v) => v.toFixed(0)} sub={`of ${stats.checkInsLogged} logged`} />
      </div>

      {(stats.bestTrade || stats.worstTrade) && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {stats.bestTrade && (
            <Card>
              <CardContent>
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Best trade</p>
                <p className="mt-1 text-[15px] font-semibold text-text-primary">{stats.bestTrade.instrument} · {stats.bestTrade.direction}</p>
                <p className={`text-[13px] font-semibold tabular-nums-all ${pnlColorClass(stats.bestTrade.netPnl)}`}>{formatCurrency(stats.bestTrade.netPnl)}</p>
              </CardContent>
            </Card>
          )}
          {stats.worstTrade && (
            <Card>
              <CardContent>
                <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Worst trade</p>
                <p className="mt-1 text-[15px] font-semibold text-text-primary">{stats.worstTrade.instrument} · {stats.worstTrade.direction}</p>
                <p className={`text-[13px] font-semibold tabular-nums-all ${pnlColorClass(stats.worstTrade.netPnl)}`}>{formatCurrency(stats.worstTrade.netPnl)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardContent className="space-y-5">
          <div>
            <Label>How did this week feel?</Label>
            <div className="flex gap-2">
              {MOOD_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setMood(emoji)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-[20px] transition-transform duration-150 hover:scale-110 ${
                    mood === emoji ? "border-accent bg-accent-soft scale-110" : "border-border text-text-secondary"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>What went well?</Label>
            <Textarea rows={2} value={wentWell} onChange={(e) => setWentWell(e.target.value)} placeholder="The setups, the discipline, the trades you didn't take..." />
          </div>
          <div>
            <Label>What would you tell yourself about this week?</Label>
            <Textarea rows={2} value={toImprove} onChange={(e) => setToImprove(e.target.value)} placeholder="Be honest — what would future-you flag?" />
          </div>
          <div>
            <Label>One focus for next week</Label>
            <Textarea rows={2} value={nextWeekFocus} onChange={(e) => setNextWeekFocus(e.target.value)} placeholder="Pick just one thing." />
          </div>
          <Button variant="primary" onClick={handleSave} className="w-full sm:w-auto">
            <Sparkles size={14} /> Save this week&rsquo;s review
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  format,
  className,
  sub,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  className?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <div className={`mt-1.5 text-[19px] font-semibold ${className ?? "text-text-primary"}`}>
        <AnimatedNumber value={value} format={format} />
      </div>
      {sub && <p className="mt-1 text-[11px] text-text-tertiary">{sub}</p>}
    </div>
  );
}
