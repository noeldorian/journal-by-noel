"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PayoutFormModal } from "@/components/payouts/payout-form-modal";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { computeAggregateStats } from "@/lib/calculations";
import { formatCurrency, formatDate, pnlColorClass } from "@/lib/utils";
import type { Payout, PayoutStatus } from "@/lib/types";

const STATUS_TONE: Record<PayoutStatus, "pos" | "warning" | "neutral"> = {
  Paid: "pos",
  Pending: "warning",
  Processing: "neutral",
};

export default function PayoutsPage() {
  const payouts = useAppStore((s) => s.payouts);
  const trades = useAppStore((s) => s.trades);
  const accounts = useAppStore((s) => s.accounts);
  const deletePayout = useAppStore((s) => s.deletePayout);
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Payout | null>(null);

  const accountName = useMemo(() => {
    const map = new Map(accounts.map((a) => [a.id, a.name]));
    return (id?: string) => (id ? map.get(id) ?? "Unlinked account" : "—");
  }, [accounts]);

  const sorted = useMemo(() => [...payouts].sort((a, b) => b.date.localeCompare(a.date)), [payouts]);

  const totalPaid = payouts.filter((p) => p.status === "Paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payouts.filter((p) => p.status !== "Paid").reduce((s, p) => s + p.amount, 0);
  const avgPayout = payouts.length ? totalPaid / (payouts.filter((p) => p.status === "Paid").length || 1) : 0;
  const netPnl = computeAggregateStats(trades).netPnl;
  const takeHomeRatio = netPnl > 0 ? (totalPaid / netPnl) * 100 : 0;

  function handleDelete(p: Payout) {
    if (confirm(`Delete this ${formatCurrency(p.amount, { showSign: false })} payout from ${formatDate(p.date)}?`)) {
      deletePayout(p.id);
      push({ title: "Payout deleted", tone: "success" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Payouts</h2>
          <p className="text-[13px] text-text-secondary">Your financial journal — every payout and withdrawal, tracked against what you actually made trading.</p>
        </div>
        <Button variant="primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={14} /> Log Payout
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent><Stat label="Total received" value={formatCurrency(totalPaid, { showSign: false })} className="text-pos" /></CardContent></Card>
        <Card><CardContent><Stat label="Pending / processing" value={formatCurrency(totalPending, { showSign: false })} className="text-warning" /></CardContent></Card>
        <Card><CardContent><Stat label="Average payout" value={payouts.filter((p) => p.status === "Paid").length ? formatCurrency(avgPayout, { showSign: false }) : "—"} /></CardContent></Card>
        <Card>
          <CardContent>
            <Stat
              label="Paid out vs. net P&L"
              value={netPnl > 0 ? `${takeHomeRatio.toFixed(0)}%` : "—"}
              className={netPnl > 0 ? pnlColorClass(netPnl) : undefined}
            />
            <p className="mt-1 text-[11px] text-text-tertiary">Net trading P&L: {formatCurrency(netPnl)}</p>
          </CardContent>
        </Card>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PiggyBank size={22} />}
            title="No payouts logged yet"
            description="Log a prop firm payout or personal withdrawal to start tracking what you've actually taken home."
            action={<Button variant="primary" onClick={() => setModalOpen(true)}>Log Payout</Button>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-tertiary">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3 text-text-secondary">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 text-text-secondary">{accountName(p.accountId)}</td>
                    <td className="px-4 py-3 text-text-primary">{p.type}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-text-tertiary">{p.method ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums-all text-pos">{formatCurrency(p.amount, { showSign: false })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="tertiary" size="icon" onClick={() => { setEditing(p); setModalOpen(true); }}><Pencil size={14} /></Button>
                        <Button variant="tertiary" size="icon" onClick={() => handleDelete(p)}><Trash2 size={14} className="text-neg" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PayoutFormModal open={modalOpen} onClose={() => setModalOpen(false)} existing={editing} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`text-[16px] font-semibold tabular-nums-all ${className ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}
