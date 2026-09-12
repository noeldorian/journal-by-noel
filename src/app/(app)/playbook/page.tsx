"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StrategyFormModal } from "@/components/playbook/strategy-form-modal";
import { useAppStore } from "@/lib/store";
import { computeAggregateStats } from "@/lib/calculations";
import { groupBy } from "@/lib/calculations";
import { formatCurrency, formatPercent, formatR, pnlColorClass } from "@/lib/utils";

function PlaybookContent() {
  const router = useRouter();
  const params = useSearchParams();
  const strategies = useAppStore((s) => s.strategies);
  const trades = useAppStore((s) => s.trades);
  const [modalOpen, setModalOpen] = useState(params.get("new") === "1");

  const byStrategy = useMemo(() => groupBy(trades.filter((t) => t.strategyId), (t) => t.strategyId as string), [trades]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Playbook</h2>
          <p className="text-[13px] text-text-secondary">Your documented setups, ranked by what actually makes money.</p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}><Plus size={14} /> Create Strategy</Button>
      </div>

      {strategies.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ListChecks size={22} />}
            title="No strategies yet"
            description="Document a setup you trade repeatedly to track its performance over time."
            action={<Button variant="primary" onClick={() => setModalOpen(true)}>Create Strategy</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {strategies.map((s) => {
            const list = byStrategy[s.id] ?? [];
            const stats = computeAggregateStats(list);
            return (
              <button key={s.id} onClick={() => router.push(`/playbook/${s.id}`)} className="text-left">
                <Card className="h-full transition-colors hover:border-border-strong">
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-[15px] font-semibold text-text-primary">{s.name}</p>
                      <p className="mt-1 line-clamp-2 text-[12.5px] text-text-secondary">{s.description || "No description yet."}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.preferredInstruments.slice(0, 4).map((i) => (
                        <span key={i} className="rounded border border-border px-1.5 py-0.5 text-[11px] text-text-tertiary">{i}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                      <MiniStat label="Trades" value={String(list.length)} />
                      <MiniStat label="Win Rate" value={list.length ? formatPercent(stats.winRate) : "—"} />
                      <MiniStat label="Avg R" value={list.length ? formatR(stats.avgR) : "—"} tone={stats.avgR} />
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <span className="text-[12px] text-text-tertiary">Net P&L</span>
                      <span className={`text-[14px] font-semibold tabular-nums-all ${pnlColorClass(stats.netPnl)}`}>{list.length ? formatCurrency(stats.netPnl) : "—"}</span>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <StrategyFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const cls = tone === undefined ? "text-text-primary" : tone > 0 ? "text-pos" : tone < 0 ? "text-neg" : "text-text-primary";
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`text-[13px] font-semibold tabular-nums-all ${cls}`}>{value}</p>
    </div>
  );
}

export default function PlaybookPage() {
  return (
    <Suspense fallback={null}>
      <PlaybookContent />
    </Suspense>
  );
}
