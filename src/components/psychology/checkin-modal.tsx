"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { todayLocalDateStr, uid } from "@/lib/utils";
import type { DailyCheckIn } from "@/lib/types";

export function CheckInModal({
  open,
  onClose,
  type,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  type: "pre" | "post";
  existing?: DailyCheckIn | null;
}) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      {/* Keying by type + existing entry forces a remount (and therefore a
          fresh field reset) whenever a different check-in is opened. */}
      <CheckInBody key={`${type}-${existing?.id ?? "new"}`} type={type} existing={existing} onClose={onClose} />
    </Modal>
  );
}

function CheckInBody({
  type,
  existing,
  onClose,
}: {
  type: "pre" | "post";
  existing?: DailyCheckIn | null;
  onClose: () => void;
}) {
  const addCheckIn = useAppStore((s) => s.addCheckIn);
  const updateCheckIn = useAppStore((s) => s.updateCheckIn);
  const { push } = useToast();

  const [bias, setBias] = useState(existing?.bias ?? "");
  const [levels, setLevels] = useState(existing?.levels ?? "");
  const [maxDailyRisk, setMaxDailyRisk] = useState(existing?.maxDailyRisk ?? "");
  const [setupsWatching, setSetupsWatching] = useState(existing?.setupsWatching ?? "");
  const [invalidation, setInvalidation] = useState(existing?.invalidation ?? "");

  const [followedPlan, setFollowedPlan] = useState(existing?.followedPlan ?? true);
  const [overtraded, setOvertraded] = useState(existing?.overtraded ?? false);
  const [revengeTraded, setRevengeTraded] = useState(existing?.revengeTraded ?? false);
  const [respectedRisk, setRespectedRisk] = useState(existing?.respectedRisk ?? true);
  const [whatWorked, setWhatWorked] = useState(existing?.whatWorked ?? "");
  const [whatDidnt, setWhatDidnt] = useState(existing?.whatDidnt ?? "");
  const [improveTomorrow, setImproveTomorrow] = useState(existing?.improveTomorrow ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: DailyCheckIn =
      type === "pre"
        ? { id: existing?.id ?? uid("chk"), date: todayLocalDateStr(), type, bias, levels, maxDailyRisk, setupsWatching, invalidation, createdAt: new Date().toISOString() }
        : { id: existing?.id ?? uid("chk"), date: todayLocalDateStr(), type, followedPlan, overtraded, revengeTraded, respectedRisk, whatWorked, whatDidnt, improveTomorrow, createdAt: new Date().toISOString() };

    if (existing) updateCheckIn(existing.id, payload);
    else addCheckIn(payload);
    push({ title: type === "pre" ? "Pre-market plan saved" : "Post-market review saved", tone: "success" });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
      <ModalHeader
        title={type === "pre" ? "Pre-Market Check-In" : "Post-Market Review"}
        subtitle={type === "pre" ? "Set your plan before the session starts." : "Reflect honestly on how today went."}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {type === "pre" ? (
          <>
            <div>
              <Label>What is my bias?</Label>
              <Textarea rows={2} value={bias} onChange={(e) => setBias(e.target.value)} />
            </div>
            <div>
              <Label>What levels am I watching?</Label>
              <Textarea rows={2} value={levels} onChange={(e) => setLevels(e.target.value)} />
            </div>
            <div>
              <Label>What is my maximum daily risk?</Label>
              <Textarea rows={1} value={maxDailyRisk} onChange={(e) => setMaxDailyRisk(e.target.value)} />
            </div>
            <div>
              <Label>What setups am I looking for?</Label>
              <Textarea rows={2} value={setupsWatching} onChange={(e) => setSetupsWatching(e.target.value)} />
            </div>
            <div>
              <Label>What would invalidate my thesis?</Label>
              <Textarea rows={2} value={invalidation} onChange={(e) => setInvalidation(e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2.5 rounded-md border border-border bg-bg-elevated p-3.5">
              <ToggleRow label="Did I follow my plan?" checked={followedPlan} onChange={setFollowedPlan} />
              <ToggleRow label="Did I overtrade?" checked={overtraded} onChange={setOvertraded} />
              <ToggleRow label="Did I revenge trade?" checked={revengeTraded} onChange={setRevengeTraded} />
              <ToggleRow label="Did I respect risk?" checked={respectedRisk} onChange={setRespectedRisk} />
            </div>
            <div>
              <Label>What worked?</Label>
              <Textarea rows={2} value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} />
            </div>
            <div>
              <Label>What didn&apos;t?</Label>
              <Textarea rows={2} value={whatDidnt} onChange={(e) => setWhatDidnt(e.target.value)} />
            </div>
            <div>
              <Label>What will I improve tomorrow?</Label>
              <Textarea rows={2} value={improveTomorrow} onChange={(e) => setImproveTomorrow(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <ModalFooter>
        <Button type="button" variant="tertiary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save</Button>
      </ModalFooter>
    </form>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
