"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StrategyFormModal } from "@/components/playbook/strategy-form-modal";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { computeAggregateStats, computeTradeMetrics, holdingMinutes } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDuration, formatPercent, formatR, pnlColorClass } from "@/lib/utils";

const RULE_SECTIONS: { key: "entryCriteria" | "confirmationCriteria" | "stopLossRules" | "takeProfitRules" | "invalidations"; label: string }[] = [
  { key: "entryCriteria", label: "Entry Criteria" },
  { key: "confirmationCriteria", label: "Confirmation Criteria" },
  { key: "stopLossRules", label: "Stop Loss Rules" },
  { key: "takeProfitRules", label: "Take Profit Rules" },
  { key: "invalidations", label: "Invalidations" },
];

export default function StrategyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const strategies = useAppStore((s) => s.strategies);
  const trades = useAppStore((s) => s.trades);
  const deleteStrategy = useAppStore((s) => s.deleteStrategy);
  const { push } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const strategy = strategies.find((s) => s.id === params.id);
  const strategyTrades = useMemo(() => trades.filter((t) => t.strategyId === params.id), [trades, params.id]);
  const stats = useMemo(() => computeAggregateStats(strategyTrades), [strategyTrades]);
  const avgDuration = useMemo(() => {
    if (strategyTrades.length === 0) return 0;
    return strategyTrades.reduce((s, t) => s + holdingMinutes(t.entryTime, t.exitTime), 0) / strategyTrades.length;
  }, [strategyTrades]);

  if (!strategy) {
    return (
      <Card>
        <EmptyState title="Strategy not found" action={<Button onClick={() => router.push("/playbook")}>Back to Playbook</Button>} />
      </Card>
    );
  }

  function handleDelete() {
    if (!strategy) return;
    if (confirm(`Delete "${strategy.name}"? Trades will keep their history but lose this strategy tag.`)) {
      deleteStrategy(strategy.id);
      push({ title: "Strategy deleted", tone: "success" });
      router.push("/playbook");
    }
  }

  const bestTrade = strategyTrades.length ? Math.max(...strategyTrades.map((t) => computeTradeMetrics(t).netPnl)) : 0;
  const worstTrade = strategyTrades.length ? Math.min(...strategyTrades.map((t) => computeTradeMetrics(t).netPnl)) : 0;

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/playbook")} className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} /> Back to Playbook
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-text-primary">{strategy.name}</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-text-secondary">{strategy.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Pencil size={13} /> Edit</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={13} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <MiniStat label="Trades" value={String(strategyTrades.length)} />
        <MiniStat label="Win Rate" value={strategyTrades.length ? formatPercent(stats.winRate) : "—"} />
        <MiniStat label="Avg R" value={strategyTrades.length ? formatR(stats.avgR) : "—"} tone={stats.avgR} />
        <MiniStat label="Profit Factor" value={strategyTrades.length ? stats.profitFactor.toFixed(2) : "—"} />
        <MiniStat label="Total P&L" value={strategyTrades.length ? formatCurrency(stats.netPnl) : "—"} tone={stats.netPnl} />
        <MiniStat label="Best Trade" value={strategyTrades.length ? formatCurrency(bestTrade) : "—"} tone={1} />
        <MiniStat label="Worst Trade" value={strategyTrades.length ? formatCurrency(worstTrade) : "—"} tone={-1} />
        <MiniStat label="Avg Duration" value={strategyTrades.length ? formatDuration(Math.round(avgDuration)) : "—"} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {RULE_SECTIONS.map((section) => (
            <Card key={section.key}>
              <CardHeader><CardTitle>{section.label}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-[13px] leading-relaxed text-text-secondary">{strategy[section.key] || "Not documented yet."}</p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-[13px] leading-relaxed text-text-secondary">{strategy.notes || "No notes yet."}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Preferred Sessions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {strategy.preferredSessions.length ? strategy.preferredSessions.map((s) => <Badge key={s} tone="accent">{s}</Badge>) : <p className="text-[13px] text-text-tertiary">Any session</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Preferred Instruments</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {strategy.preferredInstruments.length ? strategy.preferredInstruments.map((s) => <Badge key={s} tone="neutral">{s}</Badge>) : <p className="text-[13px] text-text-tertiary">Any instrument</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Trades</CardTitle></CardHeader>
            <CardContent className="p-0">
              {strategyTrades.length === 0 ? (
                <EmptyState title="No trades logged with this strategy yet" />
              ) : (
                <div className="divide-y divide-border">
                  {[...strategyTrades].sort((a, b) => (b.date + b.entryTime).localeCompare(a.date + a.entryTime)).slice(0, 8).map((t) => {
                    const m = computeTradeMetrics(t);
                    return (
                      <button key={t.id} onClick={() => router.push(`/journal/${t.id}`)} className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-surface-2">
                        <div>
                          <p className="text-[12.5px] font-medium text-text-primary">{t.instrument} · {t.direction}</p>
                          <p className="text-[11.5px] text-text-tertiary">{formatDate(t.date)}</p>
                        </div>
                        <span className={`text-[13px] font-semibold tabular-nums-all ${pnlColorClass(m.netPnl)}`}>{formatCurrency(m.netPnl)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <StrategyFormModal open={editOpen} onClose={() => setEditOpen(false)} existing={strategy} />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const cls = tone === undefined ? "text-text-primary" : tone > 0 ? "text-pos" : tone < 0 ? "text-neg" : "text-text-primary";
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[10.5px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`mt-1 text-[14px] font-semibold tabular-nums-all ${cls}`}>{value}</p>
    </div>
  );
}
