"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { uid } from "@/lib/utils";
import type { Account } from "@/lib/types";

function emptyAccount(): Account {
  return {
    id: uid("acc"),
    name: "",
    type: "Personal",
    startingBalance: 50000,
    currentBalance: 50000,
    currency: "USD",
    accountSize: 50000,
    riskPerTradePct: 1,
    dailyLossLimit: 1000,
    profitTarget: 0,
    maxDrawdown: 2000,
    propFirmMode: false,
    createdAt: new Date().toISOString(),
  };
}

export function AccountFormModal({ open, onClose, existing }: { open: boolean; onClose: () => void; existing?: Account | null }) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      {/* Keyed by the account being edited (or "new") so the form remounts
          with fresh state each time, instead of syncing via an effect. */}
      <AccountFormBody key={existing?.id ?? "new"} existing={existing} onClose={onClose} />
    </Modal>
  );
}

function AccountFormBody({ existing, onClose }: { existing?: Account | null; onClose: () => void }) {
  const addAccount = useAppStore((s) => s.addAccount);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const { push } = useToast();
  const [draft, setDraft] = useState<Account>(existing ?? emptyAccount());

  function patch<K extends keyof Account>(key: K, value: Account[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    if (existing) {
      updateAccount(draft.id, draft);
      push({ title: "Account updated", tone: "success" });
    } else {
      addAccount({ ...draft, currentBalance: draft.startingBalance });
      push({ title: "Account created", tone: "success" });
    }
    onClose();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
        <ModalHeader title={existing ? "Edit Account" : "Create Account"} subtitle="e.g. Topstep 50K or Personal Futures Account." onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <Label>Account name</Label>
            <Input required value={draft.name} onChange={(e) => patch("name", e.target.value)} placeholder="Topstep 50K" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Account type</Label>
              <Select value={draft.type} onChange={(e) => patch("type", e.target.value as Account["type"])}>
                <option>Prop Evaluation</option>
                <option>Prop Funded</option>
                <option>Personal</option>
                <option>Demo</option>
              </Select>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={draft.currency} onChange={(e) => patch("currency", e.target.value as Account["currency"])}>
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Starting balance</Label>
              <Input type="number" value={draft.startingBalance} onChange={(e) => patch("startingBalance", Number(e.target.value))} />
            </div>
            <div>
              <Label>Account size</Label>
              <Input type="number" value={draft.accountSize} onChange={(e) => patch("accountSize", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Risk per trade (%)</Label>
              <Input type="number" step="0.1" value={draft.riskPerTradePct} onChange={(e) => patch("riskPerTradePct", Number(e.target.value))} />
            </div>
            <div>
              <Label>Max contracts</Label>
              <Input type="number" value={draft.maxContracts ?? ""} onChange={(e) => patch("maxContracts", Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Daily loss limit ($)</Label>
              <Input type="number" value={draft.dailyLossLimit} onChange={(e) => patch("dailyLossLimit", Number(e.target.value))} />
            </div>
            <div>
              <Label>Max drawdown ($)</Label>
              <Input type="number" value={draft.maxDrawdown} onChange={(e) => patch("maxDrawdown", Number(e.target.value))} />
            </div>
          </div>
          <div>
            <Label>Profit target ($)</Label>
            <Input type="number" value={draft.profitTarget} onChange={(e) => patch("profitTarget", Number(e.target.value))} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-bg-elevated px-3.5 py-3">
            <div>
              <p className="text-[13px] font-medium text-text-primary">Prop firm mode</p>
              <p className="text-[12px] text-text-secondary">Track progress to target, drawdown, and daily loss limits.</p>
            </div>
            <Switch checked={draft.propFirmMode} onCheckedChange={(v) => patch("propFirmMode", v)} />
          </div>
        </div>
        <ModalFooter>
          <Button type="button" variant="tertiary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">{existing ? "Save changes" : "Create Account"}</Button>
        </ModalFooter>
      </form>
    </>
  );
}
