"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, ArrowRight, BookText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { EquityChart } from "@/components/charts/equity-chart";
import { DailyHeatmap } from "@/components/charts/daily-heatmap";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { computeAggregateStats, computeTradeMetrics, groupBy } from "@/lib/calculations";
import { DATE_RANGE_OPTIONS, filterTradesByRange, previousPeriodRange, resolveDateRange } from "@/lib/date-range";
import { generateInsights } from "@/lib/insights";
import { formatCurrency, formatDate, formatPercent, formatR, formatTime12h, pnlColorClass } from "@/lib/utils";
import type { DateRangeKey } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const trades = useAppStore((s) => s.trades);
  const strategies = useAppStore((s) => s.strategies);
  const accounts = useAppStore((s) => s.accounts);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const openAddTrade = useUiStore((s) => s.openAddTrade);

  const [rangeKey, setRangeKey] = useState<DateRangeKey>("month");
  const range = resolveDateRange(rangeKey);
  const prevRange = previousPeriodRange(range);

  const account = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  const accountTrades = useMemo(() => trades.filter((t) => t.accountId === account?.id), [trades, account]);
  const rangedTrades = useMemo(() => filterTradesByRange(accountTrades, range), [accountTrades, range]);
  const prevRangedTrades = useMemo(() => filterTradesByRange(accountTrades, prevRange), [accountTrades, prevRange]);

  const stats = useMemo(() => computeAggregateStats(rangedTrades), [rangedTrades]);
  const prevStats = useMemo(() => computeAggregateStats(prevRangedTrades), [prevRangedTrades]);
  const insights = useMemo(() => generateInsights(accountTrades), [accountTrades]);

  const strategyPerf = useMemo(() => {
    const grouped = groupBy(accountTrades.filter((t) => t.strategyId), (t) => t.strategyId as string);
    return strategies
      .map((s) => {
        const list = grouped[s.id] ?? [];
        return { strategy: s, stats: computeAggregateStats(list), count: list.length };
      })
      .filter((s) => s.count > 0)
      .sort((a, b) => b.stats.netPnl - a.stats.netPnl);
  }, [accountTrades, strategies]);

  const recentTrades = useMemo(
    () => [...accountTrades].sort((a, b) => (b.date + b.entryTime).localeCompare(a.date + a.entryTime)).slice(0, 6),
    [accountTrades]
  );

  const psychTrades = accountTrades.filter((t) => t.psychology);
  const avgPsych = psychTrades.length
    ? {
        discipline: psychTrades.reduce((s, t) => s + (t.psychology?.discipline ?? 0), 0) / psychTrades.length,
        confidence: psychTrades.reduce((s, t) => s + (t.psychology?.confidence ?? 0), 0) / psychTrades.length,
        patience: psychTrades.reduce((s, t) => s + (t.psychology?.patience ?? 0), 0) / psychTrades.length,
        focus: psychTrades.reduce((s, t) => s + (t.psychology?.focus ?? 0), 0) / psychTrades.length,
        emotionalControl: psychTrades.reduce((s, t) => s + (t.psychology?.emotionalControl ?? 0), 0) / psychTrades.length,
      }
    : null;

  function trend(current: number, prev: number) {
    if (prev === 0 && current === 0) return { direction: "flat" as const, label: "No change" };
    if (prev === 0) return { direction: "up" as const, label: "New activity" };
    const delta = ((current - prev) / Math.abs(prev)) * 100;
    if (Math.abs(delta) < 0.5) return { direction: "flat" as const, label: "Flat vs prior period" };
    return { direction: delta > 0 ? ("up" as const) : ("down" as const), label: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs prior period` };
  }

  if (!account) {
    return (
      <EmptyState
        icon={<BookText size={22} />}
        title="Create your first account"
        description="Add a trading account to start logging trades and tracking performance."
        action={<Button variant="primary" onClick={() => router.push("/accounts")}>Create account</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">
            {greeting()}, {user?.firstName ?? "Trader"}.
          </h2>
          <p className="text-[13px] text-text-secondary">Here&apos;s how {account.name} is performing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-border bg-surface-2 p-1">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRangeKey(opt.key)}
                className={`shrink-0 whitespace-nowrap rounded-[5px] px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                  rangeKey === opt.key ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={openAddTrade}>+ Add Trade</Button>
        </div>
      </div>

      {rangedTrades.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BookText size={22} />}
            title="No trades in this period"
            description="Log your first trade for this range to start building your performance history."
            action={<Button variant="primary" onClick={openAddTrade}>+ Add Trade</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Net P&L" value={stats.netPnl} format={(v) => formatCurrency(v)} valueClassName={pnlColorClass(stats.netPnl)} trendDirection={trend(stats.netPnl, prevStats.netPnl).direction} trendLabel={trend(stats.netPnl, prevStats.netPnl).label} />
          <KpiCard label="Win Rate" value={stats.winRate} format={(v) => formatPercent(v)} trendDirection={trend(stats.winRate, prevStats.winRate).direction} trendLabel={trend(stats.winRate, prevStats.winRate).label} />
          <KpiCard label="Profit Factor" value={stats.profitFactor} format={(v) => v.toFixed(2)} trendDirection={trend(stats.profitFactor, prevStats.profitFactor).direction} trendLabel={trend(stats.profitFactor, prevStats.profitFactor).label} />
          <KpiCard label="Average R" value={stats.avgR} format={(v) => formatR(v)} valueClassName={pnlColorClass(stats.avgR)} trendDirection={trend(stats.avgR, prevStats.avgR).direction} trendLabel={trend(stats.avgR, prevStats.avgR).label} />
          <KpiCard label="Total Trades" value={stats.totalTrades} format={(v) => v.toFixed(0)} sub={`${stats.wins}W / ${stats.losses}L`} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        <KpiCard label="Average Win" value={stats.avgWin} format={(v) => formatCurrency(v)} valueClassName="text-pos" />
        <KpiCard label="Average Loss" value={stats.avgLoss} format={(v) => formatCurrency(v)} valueClassName="text-neg" />
        <KpiCard label="Max Drawdown" value={stats.maxDrawdown} format={(v) => formatCurrency(v, { showSign: false })} valueClassName="text-neg" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityChart trades={accountTrades} startingBalance={account.startingBalance} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyHeatmap trades={accountTrades} onSelectDate={(date) => router.push(`/calendar?date=${date}`)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Psychology Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {avgPsych ? (
              <div className="space-y-3">
                {Object.entries(avgPsych).map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="capitalize text-text-secondary">{key.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-medium text-text-primary">{value.toFixed(1)}/10</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(value / 10) * 100}%` }} />
                    </div>
                  </div>
                ))}
                <Button variant="tertiary" size="sm" className="w-full mt-2" onClick={() => router.push("/psychology")}>
                  View Psychology <ArrowRight size={13} />
                </Button>
              </div>
            ) : (
              <EmptyState title="No psychology data yet" description="Rate your mental state when logging trades." />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {strategyPerf.length === 0 ? (
            <EmptyState title="No strategies tracked yet" description="Tag trades with a strategy to see performance breakdowns." />
          ) : (
            <div className="divide-y divide-border">
              {strategyPerf.map(({ strategy, stats: s, count }) => (
                <button
                  key={strategy.id}
                  onClick={() => router.push(`/playbook/${strategy.id}`)}
                  className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-text-primary">{strategy.name}</p>
                    <p className="text-[12px] text-text-tertiary">{count} trades · {s.winRate.toFixed(0)}% win rate</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[13.5px] font-semibold tabular-nums-all ${pnlColorClass(s.netPnl)}`}>{formatCurrency(s.netPnl)}</p>
                    <p className="text-[12px] text-text-tertiary">{formatR(s.avgR)} avg</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/journal")}>
            View all <ArrowRight size={13} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTrades.length === 0 ? (
            <EmptyState title="No trades yet" />
          ) : (
            <div className="divide-y divide-border">
              {recentTrades.map((t) => {
                const m = computeTradeMetrics(t);
                return (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/journal/${t.id}`)}
                    className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-surface-2 transition-colors"
                  >
                    <Badge tone={t.direction === "Long" ? "pos" : "neg"}>{t.direction}</Badge>
                    <div className="w-14 shrink-0 text-[13px] font-medium text-text-primary">{t.instrument}</div>
                    <div className="min-w-0 flex-1 text-[12.5px] text-text-tertiary">
                      {formatDate(t.date)} · {formatTime12h(t.entryTime)}
                    </div>
                    <div className="text-[12.5px] text-text-tertiary hidden sm:block">{t.setup ?? "—"}</div>
                    <div className={`w-24 shrink-0 text-right text-[13.5px] font-semibold tabular-nums-all ${pnlColorClass(m.netPnl)}`}>
                      {formatCurrency(m.netPnl)}
                    </div>
                    <div className={`w-16 shrink-0 text-right text-[12.5px] tabular-nums-all ${pnlColorClass(m.rMultiple)}`}>{formatR(m.rMultiple)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {insights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-2.5 rounded-md border border-border bg-bg-elevated px-3.5 py-2.5">
                <Lightbulb size={15} className={insight.tone === "pos" ? "text-pos mt-0.5" : insight.tone === "neg" ? "text-neg mt-0.5" : "text-accent mt-0.5"} />
                <p className="text-[13px] text-text-secondary">{insight.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
