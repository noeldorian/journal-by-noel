"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { uid, todayLocalDateStr } from "@/lib/utils";
import type { Payout } from "@/lib/types";

function emptyPayout(accountId?: string): Payout {
  return {
    id: uid("payout"),
    accountId,
    date: todayLocalDateStr(),
    amount: 0,
    type: "Prop Payout",
    status: "Paid",
    createdAt: new Date().toISOString(),
  };
}

export function PayoutFormModal({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Payout | null }) {
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <PayoutFormBody key={existing?.id ?? "new"} existing={existing} onClose={onClose} activeAccountId={activeAccountId ?? undefined} />
    </Modal>
  );
}

function PayoutFormBody({
  existing,
  onClose,
  activeAccountId,
}: {
  existing?: Payout | null;
  onClose: () => void;
  activeAccountId?: string;
}) {
  const addPayout = useAppStore((s) => s.addPayout);
  const updatePayout = useAppStore((s) => s.updatePayout);
  const accounts = useAppStore((s) => s.accounts);
  const { push } = useToast();
  const [draft, setDraft] = useState<Payout>(existing ?? emptyPayout(activeAccountId));

  function patch<K extends keyof Payout>(key: K, value: Payout[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.amount || draft.amount <= 0) return;
    if (existing) {
      updatePayout(draft.id, draft);
      push({ title: "Payout updated", tone: "success" });
    } else {
      addPayout(draft);
      push({ title: "Payout logged", tone: "success" });
    }
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
      <ModalHeader title={existing ? "Edit Payout" : "Log Payout"} subtitle="Track money that actually left the desk — a prop payout or a personal withdrawal." onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" required value={draft.date} onChange={(e) => patch("date", e.target.value)} />
          </div>
          <div>
            <Label>Amount ($)</Label>
            <Input type="number" step="0.01" min="0" required value={draft.amount || ""} onChange={(e) => patch("amount", Number(e.target.value))} placeholder="1500.00" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={draft.type} onChange={(e) => patch("type", e.target.value as Payout["type"])}>
              <option>Prop Payout</option>
              <option>Withdrawal</option>
              <option>Other</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={draft.status} onChange={(e) => patch("status", e.target.value as Payout["status"])}>
              <option>Paid</option>
              <option>Pending</option>
              <option>Processing</option>
            </Select>
          </div>
        </div>
        {accounts.length > 0 && (
          <div>
            <Label>Account</Label>
            <Select value={draft.accountId ?? ""} onChange={(e) => patch("accountId", e.target.value || undefined)}>
              <option value="">No specific account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label>Payout method (optional)</Label>
          <Input value={draft.method ?? ""} onChange={(e) => patch("method", e.target.value)} placeholder="Wire, PayPal, ACH..." />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Textarea rows={3} value={draft.notes ?? ""} onChange={(e) => patch("notes", e.target.value)} placeholder="Anything worth remembering about this payout." />
        </div>
      </div>
      <ModalFooter>
        <Button type="button" variant="tertiary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">{existing ? "Save changes" : "Log Payout"}</Button>
      </ModalFooter>
    </form>
  );
}
