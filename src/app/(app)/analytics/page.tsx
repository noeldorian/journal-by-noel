"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/input";
import { BreakdownBarChart } from "@/components/charts/breakdown-chart";
import { useAppStore } from "@/lib/store";
import { computeAggregateStats } from "@/lib/calculations";
import { computeBreakdown, dayOfWeek, hourBucket, rMultipleHistogram, DAY_ORDER } from "@/lib/breakdowns";
import { DATE_RANGE_OPTIONS, filterTradesByRange, resolveDateRange } from "@/lib/date-range";
import { formatCurrency, formatPercent, formatR, pnlColorClass } from "@/lib/utils";
import type { DateRangeKey } from "@/lib/types";
import { BarChart3 } from "lucide-react";

type Dimension = "instrument" | "session" | "direction" | "day" | "setup" | "hour" | "r";

const DIMENSION_TABS: { value: Dimension; label: string }[] = [
  { value: "instrument", label: "Instrument" },
  { value: "session", label: "Session" },
  { value: "direction", label: "Direction" },
  { value: "day", label: "Day" },
  { value: "setup", label: "Setup" },
  { value: "hour", label: "Time" },
  { value: "r", label: "R Multiple" },
];

export default function AnalyticsPage() {
  const trades = useAppStore((s) => s.trades);
  const accounts = useAppStore((s) => s.accounts);
  const activeAccountId = useAppStore((s) => s.activeAccountId);

  const [accountFilter, setAccountFilter] = useState<string>("active");
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("year");
  const [dimension, setDimension] = useState<Dimension>("instrument");

  const scoped = useMemo(() => {
    const byAccount = accountFilter === "all" ? trades : trades.filter((t) => t.accountId === (accountFilter === "active" ? activeAccountId : accountFilter));
    const range = resolveDateRange(rangeKey);
    return filterTradesByRange(byAccount, range);
  }, [trades, accountFilter, activeAccountId, rangeKey]);

  const stats = useMemo(() => computeAggregateStats(scoped), [scoped]);

  const breakdown = useMemo(() => {
    switch (dimension) {
      case "instrument": return computeBreakdown(scoped, (t) => t.instrument);
      case "session": return computeBreakdown(scoped, (t) => t.session);
      case "direction": return computeBreakdown(scoped, (t) => t.direction);
      case "setup": return computeBreakdown(scoped, (t) => t.setup ?? "Untagged");
      case "day": {
        const groups = computeBreakdown(scoped, (t) => dayOfWeek(t));
        return [...groups].sort((a, b) => DAY_ORDER.indexOf(a.key) - DAY_ORDER.indexOf(b.key));
      }
      case "hour": {
        const groups = computeBreakdown(scoped, (t) => hourBucket(t));
        return [...groups].sort((a, b) => hourSortValue(a.key) - hourSortValue(b.key));
      }
      default: return [];
    }
  }, [scoped, dimension]);

  const rHistogram = useMemo(() => rMultipleHistogram(scoped), [scoped]);

  if (trades.length === 0) {
    return (
      <Card>
        <EmptyState icon={<BarChart3 size={22} />} title="No data to analyze yet" description="Log a few trades to unlock performance breakdowns by instrument, session, setup, and more." />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Analytics</h2>
          <p className="text-[13px] text-text-secondary">What conditions make you profitable — and what doesn&apos;t.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-auto" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
            <option value="active">Active account</option>
            <option value="all">All accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md border border-border bg-surface-2 p-1">
            {DATE_RANGE_OPTIONS.filter((o) => o.key !== "custom").map((opt) => (
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="Expectancy" value={formatCurrency(stats.expectancy)} tone={stats.expectancy} />
        <MetricTile label="Profit Factor" value={stats.profitFactor.toFixed(2)} />
        <MetricTile label="Average R" value={formatR(stats.avgR)} tone={stats.avgR} />
        <MetricTile label="Median R" value={formatR(stats.medianR)} tone={stats.medianR} />
        <MetricTile label="Win Rate" value={formatPercent(stats.winRate)} />
        <MetricTile label="Loss Rate" value={formatPercent(stats.lossRate)} />
        <MetricTile label="Average Win" value={formatCurrency(stats.avgWin)} tone={1} />
        <MetricTile label="Average Loss" value={formatCurrency(stats.avgLoss)} tone={-1} />
        <MetricTile label="Largest Win" value={formatCurrency(stats.largestWin)} tone={1} />
        <MetricTile label="Largest Loss" value={formatCurrency(stats.largestLoss)} tone={-1} />
        <MetricTile label="Max Consecutive Wins" value={String(stats.maxConsecutiveWins)} />
        <MetricTile label="Max Consecutive Losses" value={String(stats.maxConsecutiveLosses)} />
        <MetricTile label="Max Drawdown" value={formatCurrency(stats.maxDrawdown, { showSign: false })} tone={-1} />
        <MetricTile label="Recovery Factor" value={stats.recoveryFactor.toFixed(2)} />
        <MetricTile label="Sharpe-like Ratio" value={stats.sharpeLike.toFixed(2)} />
        <MetricTile label="Total Trades" value={String(stats.totalTrades)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Breakdown</CardTitle>
          <Tabs tabs={DIMENSION_TABS} value={dimension} onChange={(v) => setDimension(v as Dimension)} />
        </CardHeader>
        <CardContent>
          {dimension === "r" ? (
            <BreakdownBarChart data={rHistogram} labelKey="bucket" valueKey="count" valueFormatter={(v) => `${v} trades`} />
          ) : (
            <BreakdownBarChart data={breakdown.map((b) => ({ key: b.key, netPnl: b.stats.netPnl }))} />
          )}

          {dimension !== "r" && (
            <div className="mt-5 overflow-x-auto rounded-md border border-border">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-2 text-text-tertiary text-[11.5px] uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">{DIMENSION_TABS.find((d) => d.value === dimension)?.label}</th>
                    <th className="px-3 py-2 text-right">Trades</th>
                    <th className="px-3 py-2 text-right">Win Rate</th>
                    <th className="px-3 py-2 text-right">Avg R</th>
                    <th className="px-3 py-2 text-right">Profit Factor</th>
                    <th className="px-3 py-2 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {breakdown.map((b) => (
                    <tr key={b.key}>
                      <td className="px-3 py-2.5 font-medium text-text-primary">{b.key}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{b.count}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{formatPercent(b.stats.winRate)}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums-all ${pnlColorClass(b.stats.avgR)}`}>{formatR(b.stats.avgR)}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{b.stats.profitFactor.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium tabular-nums-all ${pnlColorClass(b.stats.netPnl)}`}>{formatCurrency(b.stats.netPnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function hourSortValue(label: string) {
  const period = label.endsWith("AM") ? 0 : 12;
  const hour = Number(label.replace(/AM|PM/, ""));
  return (hour % 12) + period;
}

function MetricTile({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const cls = tone === undefined ? "text-text-primary" : tone > 0 ? "text-pos" : tone < 0 ? "text-neg" : "text-text-primary";
  return (
    <div className="rounded-lg border border-border bg-surface p-3.5">
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`mt-1 text-[16px] font-semibold tabular-nums-all ${cls}`}>{value}</p>
    </div>
  );
}
