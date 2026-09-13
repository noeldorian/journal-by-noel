"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Pencil, Trash2, ImageOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/lib/store";
import { useUiStore } from "@/lib/ui-store";
import { useToast } from "@/components/ui/toast";
import { computeTradeMetrics } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDuration, formatR, formatTime12h, pnlColorClass } from "@/lib/utils";
import type { TradeScreenshot } from "@/lib/types";

const NOTE_SECTIONS: { key: keyof import("@/lib/types").Trade["notes"]; label: string }[] = [
  { key: "preTradePlan", label: "Pre-Trade Plan" },
  { key: "entryReason", label: "Entry Reason" },
  { key: "management", label: "Management" },
  { key: "exitReason", label: "Exit Reason" },
  { key: "postTradeReview", label: "Post-Trade Review" },
  { key: "psychology", label: "Psychology" },
];

const STAGE_LABEL: Record<TradeScreenshot["stage"], string> = { before: "Before", during: "During", after: "After" };

export default function TradeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const trades = useAppStore((s) => s.trades);
  const accounts = useAppStore((s) => s.accounts);
  const strategies = useAppStore((s) => s.strategies);
  const deleteTrade = useAppStore((s) => s.deleteTrade);
  const openEditTrade = useUiStore((s) => s.openEditTrade);
  const { push } = useToast();
  const [activeShot, setActiveShot] = useState<TradeScreenshot["stage"]>("before");

  const sorted = useMemo(
    () => [...trades].sort((a, b) => (a.date + a.entryTime).localeCompare(b.date + b.entryTime)),
    [trades]
  );
  const index = sorted.findIndex((t) => t.id === params.id);
  const trade = index >= 0 ? sorted[index] : null;
  const prevTrade = index > 0 ? sorted[index - 1] : null;
  const nextTrade = index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null;

  if (!trade) {
    return (
      <Card>
        <EmptyState title="Trade not found" description="This trade may have been deleted." action={<Button onClick={() => router.push("/journal")}>Back to Journal</Button>} />
      </Card>
    );
  }

  const metrics = computeTradeMetrics(trade);
  const account = accounts.find((a) => a.id === trade.accountId);
  const strategy = strategies.find((s) => s.id === trade.strategyId);
  const screenshot = trade.screenshots.find((s) => s.stage === activeShot);

  function handleDelete() {
    if (!trade) return;
    if (confirm("Delete this trade? This cannot be undone.")) {
      deleteTrade(trade.id);
      push({ title: "Trade deleted", tone: "success" });
      router.push("/journal");
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={() => router.push("/journal")} className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary">
        <ArrowLeft size={14} /> Back to Journal
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold text-text-primary">{trade.instrument}</h1>
          <Badge tone={trade.direction === "Long" ? "pos" : "neg"}>{trade.direction}</Badge>
          {trade.stopLoss !== undefined && (
            <span className={`text-[20px] font-semibold tabular-nums-all ${pnlColorClass(metrics.rMultiple)}`}>{formatR(metrics.rMultiple)}</span>
          )}
          <span className={`text-[20px] font-semibold tabular-nums-all ${pnlColorClass(metrics.netPnl)}`}>{formatCurrency(metrics.netPnl)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="tertiary" size="sm" disabled={!prevTrade} onClick={() => prevTrade && router.push(`/journal/${prevTrade.id}`)}>
            <ChevronLeft size={14} /> Previous
          </Button>
          <Button variant="tertiary" size="sm" disabled={!nextTrade} onClick={() => nextTrade && router.push(`/journal/${nextTrade.id}`)}>
            Next <ChevronRight size={14} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => openEditTrade(trade.id)}><Pencil size={13} /> Edit</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}><Trash2 size={13} /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Trade Screenshots</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-3 flex gap-2">
                {(["before", "during", "after"] as const).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setActiveShot(stage)}
                    className={`rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      activeShot === stage ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-text-secondary hover:border-border-strong"
                    }`}
                  >
                    {STAGE_LABEL[stage]}
                  </button>
                ))}
              </div>
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-border bg-bg-elevated">
                {screenshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={screenshot.dataUrl} alt={`${STAGE_LABEL[activeShot]} screenshot`} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-text-tertiary">
                    <ImageOff size={22} />
                    <span className="text-[12.5px]">No {STAGE_LABEL[activeShot].toLowerCase()} screenshot</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {trade.entryPrice !== undefined && (
            <Card>
              <CardHeader><CardTitle>Execution</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Field label="Entry" value={trade.entryPrice} />
                  <Field label="Stop Loss" value={trade.stopLoss ?? "—"} />
                  <Field label="Take Profit" value={trade.takeProfit ?? "—"} />
                  <Field label="Exit" value={trade.exitPrice ?? "—"} />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Journal Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {NOTE_SECTIONS.map((section) => (
                <div key={section.key}>
                  <p className="mb-1 text-[12.5px] font-medium text-text-primary">{section.label}</p>
                  <p className="text-[13px] leading-relaxed text-text-secondary">
                    {trade.notes[section.key] || <span className="text-text-tertiary italic">Not recorded</span>}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Gross P&L" value={formatCurrency(metrics.grossPnl)} className={pnlColorClass(metrics.grossPnl)} />
              <Field label="Net P&L" value={formatCurrency(metrics.netPnl)} className={pnlColorClass(metrics.netPnl)} />
              {trade.entryPrice !== undefined && (
                <>
                  <Field label="Risk" value={formatCurrency(metrics.riskAmount, { showSign: false })} />
                  <Field label="Risk %" value={`${metrics.riskPercent.toFixed(2)}%`} />
                  <Field label="Position Size" value={formatCurrency(metrics.positionSizeUsd, { showSign: false })} />
                </>
              )}
              <Field label="Holding Time" value={formatDuration(metrics.holdingMinutes)} />
              <Field label="Contracts" value={trade.contracts} />
              <Field label="Fees + Slippage" value={formatCurrency(trade.fees + trade.slippage, { showSign: false })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Trade Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-[13px]">
              <Row label="Date" value={formatDate(trade.date)} />
              <Row label="Time" value={`${formatTime12h(trade.entryTime)} – ${formatTime12h(trade.exitTime)}`} />
              <Row label="Session" value={trade.session} />
              <Row label="Account" value={account?.name ?? "—"} />
              <Row label="Strategy" value={strategy?.name ?? trade.setup ?? "—"} />
            </CardContent>
          </Card>

          {trade.psychology && (
            <Card>
              <CardHeader><CardTitle>Psychology</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(trade.psychology).map(([key, value]) => (
                  <div key={key}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className="capitalize text-text-secondary">{key.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-medium text-text-primary">{value}/10</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(value / 10) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {trade.psychTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {trade.psychTags.map((t) => <Badge key={t} tone="warning">{t}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Tags</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {trade.tags.length === 0 ? <p className="text-[13px] text-text-tertiary">No tags</p> : trade.tags.map((t) => <Badge key={t} tone="neutral">{t}</Badge>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="tertiary" disabled={!prevTrade} onClick={() => prevTrade && router.push(`/journal/${prevTrade.id}`)}>
          <ArrowLeft size={14} /> Previous Trade
        </Button>
        <Button variant="tertiary" disabled={!nextTrade} onClick={() => nextTrade && router.push(`/journal/${nextTrade.id}`)}>
          Next Trade <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div>
      <p className="text-[11.5px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`text-[14px] font-semibold tabular-nums-all ${className ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-tertiary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
}
