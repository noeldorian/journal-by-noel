"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { uid } from "@/lib/utils";
import { INSTRUMENT_LIST } from "@/lib/instruments";
import type { InstrumentSymbol, Session, Strategy } from "@/lib/types";

const SESSIONS: Session[] = ["Asian", "London", "New York", "Custom"];

function emptyStrategy(): Strategy {
  return {
    id: uid("strat"),
    name: "",
    description: "",
    entryCriteria: "",
    confirmationCriteria: "",
    stopLossRules: "",
    takeProfitRules: "",
    invalidations: "",
    preferredSessions: [],
    preferredInstruments: [],
    notes: "",
    screenshots: [],
    createdAt: new Date().toISOString(),
  };
}

export function StrategyFormModal({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Strategy | null;
}) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      {/* Keyed by the strategy being edited (or "new") so the form remounts
          with fresh state each time, instead of syncing via an effect. */}
      <StrategyFormBody key={existing?.id ?? "new"} existing={existing} onClose={onClose} />
    </Modal>
  );
}

function StrategyFormBody({ existing, onClose }: { existing?: Strategy | null; onClose: () => void }) {
  const addStrategy = useAppStore((s) => s.addStrategy);
  const updateStrategy = useAppStore((s) => s.updateStrategy);
  const { push } = useToast();
  const [draft, setDraft] = useState<Strategy>(existing ?? emptyStrategy());

  function patch<K extends keyof Strategy>(key: K, value: Strategy[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  function toggleSession(s: Session) {
    setDraft((d) => ({ ...d, preferredSessions: d.preferredSessions.includes(s) ? d.preferredSessions.filter((x) => x !== s) : [...d.preferredSessions, s] }));
  }
  function toggleInstrument(i: InstrumentSymbol) {
    setDraft((d) => ({ ...d, preferredInstruments: d.preferredInstruments.includes(i) ? d.preferredInstruments.filter((x) => x !== i) : [...d.preferredInstruments, i] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    if (existing) {
      updateStrategy(draft.id, draft);
      push({ title: "Strategy updated", tone: "success" });
    } else {
      addStrategy(draft);
      push({ title: "Strategy created", tone: "success" });
    }
    onClose();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex max-h-[88vh] flex-col">
        <ModalHeader title={existing ? "Edit Strategy" : "Create Strategy"} subtitle="Define the rules for a setup you trade repeatedly." onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <Label>Strategy name</Label>
            <Input required value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder="NY Liquidity Reversal" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={draft.description} onChange={(e) => patch("description", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Entry criteria</Label>
              <Textarea rows={3} value={draft.entryCriteria} onChange={(e) => patch("entryCriteria", e.target.value)} />
            </div>
            <div>
              <Label>Confirmation criteria</Label>
              <Textarea rows={3} value={draft.confirmationCriteria} onChange={(e) => patch("confirmationCriteria", e.target.value)} />
            </div>
            <div>
              <Label>Stop loss rules</Label>
              <Textarea rows={3} value={draft.stopLossRules} onChange={(e) => patch("stopLossRules", e.target.value)} />
            </div>
            <div>
              <Label>Take profit rules</Label>
              <Textarea rows={3} value={draft.takeProfitRules} onChange={(e) => patch("takeProfitRules", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Invalidations</Label>
            <Textarea rows={2} value={draft.invalidations} onChange={(e) => patch("invalidations", e.target.value)} />
          </div>
          <div>
            <Label>Preferred sessions</Label>
            <div className="flex flex-wrap gap-1.5">
              {SESSIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggleSession(s)}
                  className={`rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                    draft.preferredSessions.includes(s) ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-text-secondary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Preferred instruments</Label>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUMENT_LIST.map((i) => (
                <button
                  type="button"
                  key={i.symbol}
                  onClick={() => toggleInstrument(i.symbol)}
                  className={`rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                    draft.preferredInstruments.includes(i.symbol) ? "border-accent/40 bg-accent-soft text-accent" : "border-border text-text-secondary"
                  }`}
                >
                  {i.symbol}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={draft.notes} onChange={(e) => patch("notes", e.target.value)} />
          </div>
        </div>
        <ModalFooter>
          <Button type="button" variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">{existing ? "Save changes" : "Create Strategy"}</Button>
        </ModalFooter>
      </form>
    </>
  );
}
