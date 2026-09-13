"use client";

import { useMemo, useState } from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { TagInput } from "@/components/trades/tag-input";
import { ScreenshotSlot } from "@/components/trades/screenshot-uploader";
import { UpgradePrompt } from "@/components/billing/upgrade-prompt";
import { useUiStore } from "@/lib/ui-store";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { computeTradeMetrics } from "@/lib/calculations";
import { INSTRUMENT_LIST } from "@/lib/instruments";
import { canAddTrade, tradesThisMonth } from "@/lib/premium";
import { FREE_TIER_LIMITS } from "@/lib/types";
import { formatCurrency, formatDuration, formatR, pnlColorClass, todayLocalDateStr, uid } from "@/lib/utils";
import type { Direction, InstrumentSymbol, PsychTag, Session, Trade, TradeScreenshot } from "@/lib/types";

const PSYCH_TAGS: PsychTag[] = ["FOMO", "Revenge", "Hesitation", "Greed", "Fear", "Overconfidence", "Impatience", "Boredom"];
const PSYCH_FIELDS: { key: keyof NonNullable<Trade["psychology"]>; label: string }[] = [
  { key: "confidence", label: "Confidence" },
  { key: "patience", label: "Patience" },
  { key: "discipline", label: "Discipline" },
  { key: "focus", label: "Focus" },
  { key: "emotionalControl", label: "Emotional control" },
];

function emptyDraft(accountId: string): Trade {
  const now = new Date().toISOString();
  return {
    id: uid("trade"),
    accountId,
    date: todayLocalDateStr(),
    entryTime: "09:30",
    exitTime: "10:00",
    instrument: "NQ",
    direction: "Long",
    session: "New York",
    entryPrice: 0,
    exitPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    contracts: 1,
    fees: 0,
    slippage: 0,
    tags: [],
    psychTags: [],
    psychology: { confidence: 7, patience: 7, discipline: 7, focus: 7, emotionalControl: 7 },
    notes: {},
    screenshots: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function TradeFormModal() {
  const { open, tradeId } = useUiStore((s) => s.tradeModal);
  const closeTradeModal = useUiStore((s) => s.closeTradeModal);

  return (
    <Modal open={open} onClose={closeTradeModal} size="xl">
      {/* Keying by tradeId (or "new") forces a fresh mount — and therefore
          fresh local state — each time a different trade is opened, instead
          of syncing props into state via an effect. */}
      <TradeFormBody key={tradeId ?? "new"} tradeId={tradeId} onClose={closeTradeModal} />
    </Modal>
  );
}

function TradeFormBody({ tradeId, onClose }: { tradeId: string | null; onClose: () => void }) {
  const accounts = useAppStore((s) => s.accounts);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const strategies = useAppStore((s) => s.strategies);
  const trades = useAppStore((s) => s.trades);
  const subscription = useAppStore((s) => s.subscription);
  const addTrade = useAppStore((s) => s.addTrade);
  const updateTrade = useAppStore((s) => s.updateTrade);
  const userId = useAppStore((s) => s.userId);
  const { push } = useToast();

  const existing = tradeId ? trades.find((t) => t.id === tradeId) : null;
  const [draft, setDraft] = useState<Trade>(() => existing ?? emptyDraft(activeAccountId ?? accounts[0]?.id ?? ""));
  const metrics = useMemo(() => computeTradeMetrics(draft), [draft]);

  // Only new trades count against the free-tier monthly cap — editing an
  // existing one never should, even if the cap's already been hit. This
  // check has to come after every hook call above (rules of hooks).
  if (!existing && !canAddTrade(subscription, trades)) {
    return (
      <>
        <ModalHeader title="Monthly trade limit reached" subtitle="" onClose={onClose} />
        <div className="p-6">
          <UpgradePrompt
            title={`You've logged ${tradesThisMonth(trades)} of ${FREE_TIER_LIMITS.maxTradesPerMonth} free trades this month`}
            description="Upgrade to Premium for unlimited trades, unlimited accounts, and everything else in the journal."
          />
        </div>
      </>
    );
  }

  function patch<K extends keyof Trade>(key: K, value: Trade[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function patchNotes(key: keyof Trade["notes"], value: string) {
    setDraft((d) => ({ ...d, notes: { ...d.notes, [key]: value } }));
  }
  function patchPsych(key: keyof NonNullable<Trade["psychology"]>, value: number) {
    setDraft((d) => ({ ...d, psychology: { ...(d.psychology ?? { confidence: 5, patience: 5, discipline: 5, focus: 5, emotionalControl: 5 }), [key]: value } }));
  }
  function togglePsychTag(tag: PsychTag) {
    setDraft((d) => ({
      ...d,
      psychTags: d.psychTags.includes(tag) ? d.psychTags.filter((t) => t !== tag) : [...d.psychTags, tag],
    }));
  }
  function setScreenshot(stage: TradeScreenshot["stage"], shot: TradeScreenshot | null) {
    setDraft((d) => ({
      ...d,
      screenshots: [...d.screenshots.filter((s) => s.stage !== stage), ...(shot ? [shot] : [])],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.accountId) {
      push({ title: "Select an account", tone: "error" });
      return;
    }
    if (existing) {
      updateTrade(draft.id, draft);
      push({ title: "Trade updated", tone: "success" });
    } else {
      addTrade(draft);
      push({ title: "Trade logged", tone: "success", description: `${draft.instrument} ${draft.direction} · ${formatCurrency(computeTradeMetrics(draft).netPnl)}` });
    }
    onClose();
  }

  const screenshotFor = (stage: TradeScreenshot["stage"]) => draft.screenshots.find((s) => s.stage === stage);

  return (
    <>
      <form onSubmit={handleSubmit} className="flex max-h-[90vh] flex-col">
        <ModalHeader
          title={existing ? "Edit Trade" : "Add Trade"}
          subtitle={existing ? "Update the details of this trade." : "Log a new futures trade to your journal."}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Trade Information</h3>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <div>
                <Label>Date</Label>
                <Input type="date" required value={draft.date} onChange={(e) => patch("date", e.target.value)} />
              </div>
              <div>
                <Label>Entry time</Label>
                <Input type="time" required value={draft.entryTime} onChange={(e) => patch("entryTime", e.target.value)} />
              </div>
              <div>
                <Label>Exit time</Label>
                <Input type="time" required value={draft.exitTime} onChange={(e) => patch("exitTime", e.target.value)} />
              </div>
              <div>
                <Label>Instrument</Label>
                <Select value={draft.instrument} onChange={(e) => patch("instrument", e.target.value as InstrumentSymbol)}>
                  {INSTRUMENT_LIST.map((i) => (
                    <option key={i.symbol} value={i.symbol}>{i.symbol} — {i.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Direction</Label>
                <div className="flex rounded-md border border-border-strong bg-bg-elevated p-1">
                  {(["Long", "Short"] as Direction[]).map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => patch("direction", d)}
                      className={`flex-1 rounded-[5px] py-1.5 text-[13px] font-medium transition-colors ${
                        draft.direction === d
                          ? d === "Long" ? "bg-pos-soft text-pos" : "bg-neg-soft text-neg"
                          : "text-text-tertiary"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Session</Label>
                <Select value={draft.session} onChange={(e) => patch("session", e.target.value as Session)}>
                  <option>Asian</option>
                  <option>London</option>
                  <option>New York</option>
                  <option>Custom</option>
                </Select>
              </div>
              <div>
                <Label>Account</Label>
                <Select value={draft.accountId} onChange={(e) => patch("accountId", e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Strategy / Setup</Label>
                <Select
                  value={draft.strategyId ?? ""}
                  onChange={(e) => {
                    const strat = strategies.find((s) => s.id === e.target.value);
                    setDraft((d) => ({ ...d, strategyId: strat?.id, setup: strat?.name }));
                  }}
                >
                  <option value="">No strategy</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Execution</h3>
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <div>
                <Label>Entry price</Label>
                <Input type="number" step="0.01" required value={draft.entryPrice || ""} onChange={(e) => patch("entryPrice", Number(e.target.value))} />
              </div>
              <div>
                <Label>Exit price</Label>
                <Input type="number" step="0.01" required value={draft.exitPrice || ""} onChange={(e) => patch("exitPrice", Number(e.target.value))} />
              </div>
              <div>
                <Label>Stop loss</Label>
                <Input type="number" step="0.01" required value={draft.stopLoss || ""} onChange={(e) => patch("stopLoss", Number(e.target.value))} />
              </div>
              <div>
                <Label>Take profit</Label>
                <Input type="number" step="0.01" value={draft.takeProfit || ""} onChange={(e) => patch("takeProfit", Number(e.target.value))} />
              </div>
              <div>
                <Label>Contracts</Label>
                <Input type="number" min="1" required value={draft.contracts || ""} onChange={(e) => patch("contracts", Number(e.target.value))} />
              </div>
              <div>
                <Label>Fees ($)</Label>
                <Input type="number" step="0.01" value={draft.fees || ""} onChange={(e) => patch("fees", Number(e.target.value))} />
              </div>
              <div>
                <Label>Slippage ($)</Label>
                <Input type="number" step="0.01" value={draft.slippage || ""} onChange={(e) => patch("slippage", Number(e.target.value))} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-border bg-bg-elevated p-3.5 sm:grid-cols-4">
              <Stat label="Gross P&L" value={formatCurrency(metrics.grossPnl)} className={pnlColorClass(metrics.grossPnl)} />
              <Stat label="Net P&L" value={formatCurrency(metrics.netPnl)} className={pnlColorClass(metrics.netPnl)} />
              <Stat label="R Multiple" value={formatR(metrics.rMultiple)} className={pnlColorClass(metrics.rMultiple)} />
              <Stat label="Risk %" value={`${metrics.riskPercent.toFixed(2)}%`} />
              <Stat label="Risk amount" value={formatCurrency(metrics.riskAmount, { showSign: false })} />
              <Stat label="Position size" value={formatCurrency(metrics.positionSizeUsd, { showSign: false })} />
              <Stat label="Holding time" value={formatDuration(metrics.holdingMinutes)} />
              <Stat label="Result" value={metrics.result} className={pnlColorClass(metrics.netPnl)} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Tags</h3>
            <TagInput value={draft.tags} onChange={(tags) => patch("tags", tags)} />
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Screenshots</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ScreenshotSlot userId={userId!} tradeId={draft.id} stage="before" label="Before trade" screenshot={screenshotFor("before")} onChange={(s) => setScreenshot("before", s)} />
              <ScreenshotSlot userId={userId!} tradeId={draft.id} stage="during" label="During trade" screenshot={screenshotFor("during")} onChange={(s) => setScreenshot("during", s)} />
              <ScreenshotSlot userId={userId!} tradeId={draft.id} stage="after" label="After trade" screenshot={screenshotFor("after")} onChange={(s) => setScreenshot("after", s)} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Journal Notes</h3>
            <div className="space-y-3.5">
              <div>
                <Label>Pre-Trade Plan — what was my thesis?</Label>
                <Textarea rows={2} value={draft.notes.preTradePlan ?? ""} onChange={(e) => patchNotes("preTradePlan", e.target.value)} />
              </div>
              <div>
                <Label>Entry Reason — why did I enter?</Label>
                <Textarea rows={2} value={draft.notes.entryReason ?? ""} onChange={(e) => patchNotes("entryReason", e.target.value)} />
              </div>
              <div>
                <Label>Management — how did I manage the position?</Label>
                <Textarea rows={2} value={draft.notes.management ?? ""} onChange={(e) => patchNotes("management", e.target.value)} />
              </div>
              <div>
                <Label>Exit Reason — why did I exit?</Label>
                <Textarea rows={2} value={draft.notes.exitReason ?? ""} onChange={(e) => patchNotes("exitReason", e.target.value)} />
              </div>
              <div>
                <Label>Post-Trade Review — what did I learn?</Label>
                <Textarea rows={2} value={draft.notes.postTradeReview ?? ""} onChange={(e) => patchNotes("postTradeReview", e.target.value)} />
              </div>
              <div>
                <Label>Psychology — how was my mental state?</Label>
                <Textarea rows={2} value={draft.notes.psychology ?? ""} onChange={(e) => patchNotes("psychology", e.target.value)} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">Psychology Ratings</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {PSYCH_FIELDS.map((f) => (
                <div key={f.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="mb-0">{f.label}</Label>
                    <span className="text-[12px] font-medium text-text-secondary">{draft.psychology?.[f.key] ?? 5}/10</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={draft.psychology?.[f.key] ?? 5}
                    onChange={(e) => patchPsych(f.key, Number(e.target.value))}
                    className="w-full accent-[var(--accent)]"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label>Psychology tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {PSYCH_TAGS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => togglePsychTag(tag)}
                    className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                      draft.psychTags.includes(tag)
                        ? "border-warning/30 bg-warning-soft text-warning"
                        : "border-border text-text-secondary hover:border-border-strong"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        <ModalFooter>
          <Button type="button" variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">{existing ? "Save changes" : "Log Trade"}</Button>
        </ModalFooter>
      </form>
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`text-[13px] font-semibold tabular-nums-all ${className ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}
