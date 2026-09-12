"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useAppStore } from "@/lib/store";
import { computeTradeMetrics } from "@/lib/calculations";
import { recommendedContracts } from "@/lib/calculations";
import { INSTRUMENT_LIST, INSTRUMENTS } from "@/lib/instruments";
import { formatCurrency, pnlColorClass, todayLocalDateStr } from "@/lib/utils";
import type { InstrumentSymbol } from "@/lib/types";

export default function RiskPage() {
  const accounts = useAppStore((s) => s.accounts);
  const trades = useAppStore((s) => s.trades);
  const activeAccountId = useAppStore((s) => s.activeAccountId);
  const updateAccount = useAppStore((s) => s.updateAccount);

  const account = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  const accountTrades = useMemo(() => trades.filter((t) => t.accountId === account?.id), [trades, account]);

  const [accountSize, setAccountSize] = useState(account?.accountSize ?? 50000);
  const [riskPct, setRiskPct] = useState(account?.riskPerTradePct ?? 0.5);
  const [entry, setEntry] = useState(21500);
  const [stopLoss, setStopLoss] = useState(21480);
  const [instrument, setInstrument] = useState<InstrumentSymbol>("NQ");

  const calc = useMemo(() => recommendedContracts({ accountSize, riskPct, entry, stopLoss, instrument }), [accountSize, riskPct, entry, stopLoss, instrument]);

  const today = todayLocalDateStr();
  const todayTrades = accountTrades.filter((t) => t.date === today);
  const todayNet = todayTrades.reduce((s, t) => s + computeTradeMetrics(t).netPnl, 0);
  const todayLoss = Math.max(0, -todayNet);

  let consecutiveLosses = 0;
  const sortedDesc = [...accountTrades].sort((a, b) => (b.date + b.entryTime).localeCompare(a.date + a.entryTime));
  for (const t of sortedDesc) {
    if (computeTradeMetrics(t).result === "Loss") consecutiveLosses += 1;
    else break;
  }

  if (!account) {
    return <Card><EmptyState icon={<ShieldAlert size={22} />} title="No account selected" description="Create an account to configure risk management." /></Card>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[19px] font-semibold text-text-primary">Risk Management</h2>
        <p className="text-[13px] text-text-secondary">Configure limits for {account.name} and size positions with confidence.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Position Size Calculator</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Account size ($)</Label>
                <Input type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} />
              </div>
              <div>
                <Label>Risk %</Label>
                <Input type="number" step="0.1" value={riskPct} onChange={(e) => setRiskPct(Number(e.target.value))} />
              </div>
              <div>
                <Label>Instrument</Label>
                <Select value={instrument} onChange={(e) => setInstrument(e.target.value as InstrumentSymbol)}>
                  {INSTRUMENT_LIST.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol}</option>)}
                </Select>
              </div>
              <div />
              <div>
                <Label>Entry price</Label>
                <Input type="number" step="0.01" value={entry} onChange={(e) => setEntry(Number(e.target.value))} />
              </div>
              <div>
                <Label>Stop loss price</Label>
                <Input type="number" step="0.01" value={stopLoss} onChange={(e) => setStopLoss(Number(e.target.value))} />
              </div>
            </div>

            <div className="rounded-lg border border-accent/25 bg-accent-soft p-4 text-center">
              <p className="text-[12px] font-medium uppercase tracking-wide text-text-secondary">Recommended Contracts</p>
              <p className="mt-1 text-[32px] font-semibold text-accent tabular-nums-all">{calc.contracts}</p>
              <p className="mt-1 text-[12px] text-text-tertiary">
                {INSTRUMENTS[instrument].name} · tick value {formatCurrency(INSTRUMENTS[instrument].tickValue, { showSign: false })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-bg-elevated p-3">
                <p className="text-[11px] text-text-tertiary">Risk per contract</p>
                <p className="text-[14px] font-semibold text-text-primary">{formatCurrency(calc.riskPerContract, { showSign: false })}</p>
              </div>
              <div className="rounded-md border border-border bg-bg-elevated p-3">
                <p className="text-[11px] text-text-tertiary">Total risk at this size</p>
                <p className="text-[14px] font-semibold text-text-primary">{formatCurrency(calc.riskDollar, { showSign: false })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Today&apos;s Risk Usage</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <UsageBar label="Daily loss" used={todayLoss} limit={account.dailyLossLimit} format={(v) => formatCurrency(v, { showSign: false })} />
              <UsageBar label="Trades today" used={todayTrades.length} limit={account.maxTradesPerDay ?? 0} format={(v) => String(v)} />
              <UsageBar label="Consecutive losses" used={consecutiveLosses} limit={account.maxConsecutiveLosses ?? 0} format={(v) => String(v)} />
              <div className="flex items-center justify-between border-t border-border pt-3 text-[13px]">
                <span className="text-text-tertiary">Today&apos;s P&L</span>
                <span className={`font-semibold tabular-nums-all ${pnlColorClass(todayNet)}`}>{formatCurrency(todayNet)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Risk Rules for {account.name}</CardTitle></CardHeader>
            <CardContent className="space-y-3.5">
              <ConfigRow label="Risk per trade" value={account.riskPerTradePct} suffix="%" onChange={(v) => updateAccount(account.id, { riskPerTradePct: v })} />
              <ConfigRow label="Max daily loss" value={account.dailyLossLimit} prefix="$" onChange={(v) => updateAccount(account.id, { dailyLossLimit: v })} />
              <ConfigRow label="Max trades per day" value={account.maxTradesPerDay ?? 0} onChange={(v) => updateAccount(account.id, { maxTradesPerDay: v })} />
              <ConfigRow label="Max consecutive losses" value={account.maxConsecutiveLosses ?? 0} onChange={(v) => updateAccount(account.id, { maxConsecutiveLosses: v })} />
              <ConfigRow label="Daily profit target" value={account.profitTarget} prefix="$" onChange={(v) => updateAccount(account.id, { profitTarget: v })} />
              <ConfigRow label="Max contracts" value={account.maxContracts ?? 0} onChange={(v) => updateAccount(account.id, { maxContracts: v })} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit, format }: { label: string; used: number; limit: number; format: (v: number) => string }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12.5px]">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">{format(used)}{limit > 0 ? ` / ${format(limit)}` : ""}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-2">
        <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-neg" : pct >= 50 ? "bg-warning" : "bg-pos"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ConfigRow({ label, value, onChange, prefix, suffix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; suffix?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-[12px] text-text-tertiary">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 w-24 rounded-md border border-border-strong bg-bg-elevated px-2 text-right text-[13px] outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
        />
        {suffix && <span className="text-[12px] text-text-tertiary">{suffix}</span>}
      </div>
    </div>
  );
}
