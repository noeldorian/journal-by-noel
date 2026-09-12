"use client";

import { useMemo, useState } from "react";
import { Brain, Sunrise, Moon, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckInModal } from "@/components/psychology/checkin-modal";
import { useAppStore } from "@/lib/store";
import { computeAggregateStats } from "@/lib/calculations";
import { BreakdownBarChart } from "@/components/charts/breakdown-chart";
import { formatCurrency, formatDate, formatPercent, formatR, pnlColorClass, todayLocalDateStr } from "@/lib/utils";
import type { PsychTag, Trade } from "@/lib/types";

const PSYCH_FIELDS: { key: keyof NonNullable<Trade["psychology"]>; label: string }[] = [
  { key: "discipline", label: "Discipline" },
  { key: "confidence", label: "Confidence" },
  { key: "patience", label: "Patience" },
  { key: "focus", label: "Focus" },
  { key: "emotionalControl", label: "Emotional Control" },
];

const PSYCH_TAGS: PsychTag[] = ["FOMO", "Revenge", "Hesitation", "Greed", "Fear", "Overconfidence", "Impatience", "Boredom"];

export default function PsychologyPage() {
  const trades = useAppStore((s) => s.trades);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const checkIns = useAppStore((s) => s.checkIns);

  const [checkInModal, setCheckInModal] = useState<"pre" | "post" | null>(null);

  const accountTrades = useMemo(() => trades.filter((t) => t.accountId === activeAccountId && t.psychology), [trades, activeAccountId]);

  const todayPre = checkIns.find((c) => c.date === todayLocalDateStr() && c.type === "pre");
  const todayPost = checkIns.find((c) => c.date === todayLocalDateStr() && c.type === "post");

  const avgByField = useMemo(() => {
    if (accountTrades.length === 0) return null;
    const out: Record<string, number> = {};
    for (const f of PSYCH_FIELDS) {
      out[f.key] = accountTrades.reduce((s, t) => s + (t.psychology?.[f.key] ?? 0), 0) / accountTrades.length;
    }
    return out;
  }, [accountTrades]);

  const disciplineBuckets = useMemo(() => {
    const buckets = [
      { label: "1-4", test: (v: number) => v <= 4 },
      { label: "5-7", test: (v: number) => v >= 5 && v <= 7 },
      { label: "8-10", test: (v: number) => v >= 8 },
    ];
    return buckets.map((b) => {
      const list = accountTrades.filter((t) => b.test(t.psychology?.discipline ?? 0));
      const stats = computeAggregateStats(list);
      return { key: b.label, count: list.length, avgR: Number(stats.avgR.toFixed(2)), winRate: stats.winRate };
    });
  }, [accountTrades]);

  const tagImpact = useMemo(() => {
    return PSYCH_TAGS.map((tag) => {
      const list = accountTrades.filter((t) => t.psychTags.includes(tag));
      const stats = computeAggregateStats(list);
      return { tag, count: list.length, stats };
    }).filter((t) => t.count > 0).sort((a, b) => a.stats.avgR - b.stats.avgR);
  }, [accountTrades]);

  const bestDisciplineStats = disciplineBuckets.find((b) => b.key === "8-10" && b.count >= 3);
  const recentCheckIns = [...checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Psychology</h2>
          <p className="text-[13px] text-text-secondary">Your mental state, measured against your actual results.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setCheckInModal("pre")}>
            <Sunrise size={14} /> {todayPre ? "Edit Pre-Market" : "Pre-Market Check-In"}
          </Button>
          <Button variant="secondary" onClick={() => setCheckInModal("post")}>
            <Moon size={14} /> {todayPost ? "Edit Post-Market" : "Post-Market Review"}
          </Button>
        </div>
      </div>

      {bestDisciplineStats && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Brain size={18} className="text-accent shrink-0" />
            <p className="text-[13.5px] text-text-secondary">
              When your discipline score is <span className="font-medium text-text-primary">8+</span>, your average
              trade is <span className={`font-medium ${pnlColorClass(bestDisciplineStats.avgR)}`}>{formatR(bestDisciplineStats.avgR)}</span>.
            </p>
          </CardContent>
        </Card>
      )}

      {!avgByField ? (
        <Card><EmptyState icon={<Brain size={22} />} title="No psychology data yet" description="Rate your confidence, patience, discipline, focus, and emotional control when logging trades." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Discipline vs. Performance</CardTitle></CardHeader>
            <CardContent>
              <BreakdownBarChart data={disciplineBuckets.map((b) => ({ key: `Score ${b.key}`, netPnl: b.avgR }))} valueFormatter={(v) => `${formatR(v)} avg`} />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {disciplineBuckets.map((b) => (
                  <div key={b.key} className="rounded-md border border-border bg-bg-elevated p-3 text-center">
                    <p className="text-[11px] text-text-tertiary">Score {b.key}</p>
                    <p className={`text-[15px] font-semibold ${pnlColorClass(b.avgR)}`}>{b.count > 0 ? formatR(b.avgR) : "—"}</p>
                    <p className="text-[11px] text-text-tertiary">{b.count} trades · {b.count ? formatPercent(b.winRate) : "—"} WR</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Average Ratings</CardTitle></CardHeader>
            <CardContent className="space-y-3.5">
              {PSYCH_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]">
                    <span className="text-text-secondary">{f.label}</span>
                    <span className="font-medium text-text-primary">{avgByField[f.key].toFixed(1)}/10</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(avgByField[f.key] / 10) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {tagImpact.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Psychological Patterns</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-surface-2 text-text-tertiary text-[11.5px] uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Tag</th>
                    <th className="px-4 py-2.5 text-right">Trades</th>
                    <th className="px-4 py-2.5 text-right">Win Rate</th>
                    <th className="px-4 py-2.5 text-right">Avg R</th>
                    <th className="px-4 py-2.5 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tagImpact.map(({ tag, count, stats }) => (
                    <tr key={tag}>
                      <td className="px-4 py-2.5 font-medium text-text-primary">{tag}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{count}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{formatPercent(stats.winRate)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums-all ${pnlColorClass(stats.avgR)}`}>{formatR(stats.avgR)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium tabular-nums-all ${pnlColorClass(stats.netPnl)}`}>{formatCurrency(stats.netPnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Check-In History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentCheckIns.length === 0 ? (
            <EmptyState title="No check-ins yet" description="Use the buttons above to plan your session and review it afterward." />
          ) : (
            <div className="divide-y divide-border">
              {recentCheckIns.map((c) => (
                <div key={c.id} className="flex items-start gap-3 px-4 py-3">
                  {c.type === "pre" ? <Sunrise size={15} className="mt-0.5 text-accent shrink-0" /> : <Moon size={15} className="mt-0.5 text-accent shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12.5px] font-medium text-text-primary">{formatDate(c.date)}</p>
                      <span className="text-[11px] text-text-tertiary">{c.type === "pre" ? "Pre-Market" : "Post-Market"}</span>
                    </div>
                    {c.type === "pre" ? (
                      <p className="mt-0.5 truncate text-[12.5px] text-text-secondary">{c.bias || "No bias recorded"}</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-text-tertiary">
                        <span className="flex items-center gap-1">{c.followedPlan ? <CheckCircle2 size={12} className="text-pos" /> : <Circle size={12} />} Followed plan</span>
                        <span className="flex items-center gap-1">{!c.overtraded ? <CheckCircle2 size={12} className="text-pos" /> : <Circle size={12} className="text-neg" />} No overtrading</span>
                        <span className="flex items-center gap-1">{!c.revengeTraded ? <CheckCircle2 size={12} className="text-pos" /> : <Circle size={12} className="text-neg" />} No revenge trades</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CheckInModal
        open={checkInModal !== null}
        onClose={() => setCheckInModal(null)}
        type={checkInModal ?? "pre"}
        existing={checkInModal === "pre" ? todayPre : todayPost}
      />
    </div>
  );
}
