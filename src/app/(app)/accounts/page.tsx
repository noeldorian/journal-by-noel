"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountFormModal } from "@/components/accounts/account-form-modal";
import { PropFirmProgress } from "@/components/accounts/prop-firm-progress";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { computeAggregateStats } from "@/lib/calculations";
import { formatCurrency, formatPercent, pnlColorClass } from "@/lib/utils";
import type { Account } from "@/lib/types";

export default function AccountsPage() {
  const accounts = useAppStore((s) => s.accounts);
  const trades = useAppStore((s) => s.trades);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const setActiveAccount = useAppStore((s) => s.setActiveAccount);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const tradesByAccount = useMemo(() => {
    const map = new Map<string, typeof trades>();
    for (const a of accounts) map.set(a.id, trades.filter((t) => t.accountId === a.id));
    return map;
  }, [accounts, trades]);

  function handleDelete(account: Account) {
    if (confirm(`Delete "${account.name}"? Its trades will remain in your journal but lose their account link.`)) {
      deleteAccount(account.id);
      push({ title: "Account deleted", tone: "success" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[19px] font-semibold text-text-primary">Accounts</h2>
          <p className="text-[13px] text-text-secondary">Manage every trading account you journal.</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingAccount(null); setModalOpen(true); }}><Plus size={14} /> Create Account</Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <EmptyState icon={<Wallet size={22} />} title="No accounts yet" description="Create your first trading account to start logging trades." action={<Button variant="primary" onClick={() => setModalOpen(true)}>Create Account</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {accounts.map((account) => {
            const accountTrades = tradesByAccount.get(account.id) ?? [];
            const stats = computeAggregateStats(accountTrades);
            const pnl = account.currentBalance - account.startingBalance;
            const isActive = account.id === activeAccountId;

            return (
              <Card key={account.id} className={isActive ? "border-accent/30" : undefined}>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] font-semibold text-text-primary">{account.name}</p>
                        {isActive && <Badge tone="accent">Active</Badge>}
                        {account.propFirmMode && <Badge tone="neutral">{account.type}</Badge>}
                      </div>
                      <p className="mt-0.5 text-[12px] text-text-tertiary">{account.broker ?? "No broker set"} · {account.currency}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="tertiary" size="icon" onClick={() => { setEditingAccount(account); setModalOpen(true); }}><Pencil size={14} /></Button>
                      <Button variant="tertiary" size="icon" onClick={() => handleDelete(account)}><Trash2 size={14} className="text-neg" /></Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Balance" value={formatCurrency(account.currentBalance, { showSign: false })} />
                    <Stat label="P&L" value={formatCurrency(pnl)} className={pnlColorClass(pnl)} />
                    <Stat label="Win Rate" value={accountTrades.length ? formatPercent(stats.winRate) : "—"} />
                    <Stat label="Trades" value={String(accountTrades.length)} />
                  </div>

                  {account.propFirmMode && (
                    <div className="border-t border-border pt-4">
                      <PropFirmProgress account={account} trades={accountTrades} />
                    </div>
                  )}

                  {!isActive && (
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => setActiveAccount(account.id)}>
                      <CheckCircle2 size={13} /> Switch to this account
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AccountFormModal open={modalOpen} onClose={() => setModalOpen(false)} existing={editingAccount} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className={`text-[14px] font-semibold tabular-nums-all ${className ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}
