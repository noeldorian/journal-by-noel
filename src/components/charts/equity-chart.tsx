"use client";

import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush, ReferenceLine,
} from "recharts";
import { Tabs } from "@/components/ui/tabs";
import { buildEquitySeries } from "@/lib/equity-series";
import { formatCurrency, formatR } from "@/lib/utils";
import type { Trade } from "@/lib/types";

type ViewMode = "balance" | "pnl" | "r";
type Granularity = "daily" | "weekly" | "monthly";

const VIEW_TABS = [
  { value: "balance", label: "Account Balance" },
  { value: "pnl", label: "Cumulative P&L" },
  { value: "r", label: "R Multiple" },
];
const GRAN_TABS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function CustomTooltip({ active, payload, viewMode }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; viewMode: ViewMode }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as { label: string; balance: number; cumulativePnl: number; cumulativeR: number; drawdown: number; netPnl: number };
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2.5 shadow-[var(--shadow-modal)] text-[12px]">
      <p className="mb-1 font-medium text-text-primary">{p.label}</p>
      {viewMode === "balance" && <p className="text-text-secondary">Balance: <span className="font-medium text-text-primary">{formatCurrency(p.balance, { showSign: false })}</span></p>}
      {viewMode === "pnl" && <p className="text-text-secondary">Cumulative P&L: <span className="font-medium text-text-primary">{formatCurrency(p.cumulativePnl)}</span></p>}
      {viewMode === "r" && <p className="text-text-secondary">Cumulative R: <span className="font-medium text-text-primary">{formatR(p.cumulativeR)}</span></p>}
      <p className="text-text-tertiary">Period P&L: {formatCurrency(p.netPnl)}</p>
      {p.drawdown < 0 && <p className="text-neg">Drawdown: {formatCurrency(p.drawdown)}</p>}
    </div>
  );
}

export function EquityChart({ trades, startingBalance }: { trades: Trade[]; startingBalance: number }) {
  const [viewMode, setViewMode] = useState<ViewMode>("balance");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [showDrawdown, setShowDrawdown] = useState(true);

  const series = useMemo(() => buildEquitySeries(trades, startingBalance, granularity), [trades, startingBalance, granularity]);

  const dataKey = viewMode === "balance" ? "balance" : viewMode === "pnl" ? "cumulativePnl" : "cumulativeR";
  const values = series.map((p) => p[dataKey]);
  const isPositiveOverall = values[values.length - 1] >= (viewMode === "balance" ? startingBalance : 0);
  const lineColor = isPositiveOverall ? "var(--pos)" : "var(--neg)";
  const formatY = viewMode === "r" ? (v: number) => `${v.toFixed(0)}R` : (v: number) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs tabs={VIEW_TABS} value={viewMode} onChange={(v) => setViewMode(v as ViewMode)} />
        <Tabs tabs={GRAN_TABS} value={granularity} onChange={(v) => setGranularity(v as Granularity)} className="ml-auto" />
        <label className="flex items-center gap-1.5 text-[12px] text-text-secondary pl-1">
          <input type="checkbox" checked={showDrawdown} onChange={(e) => setShowDrawdown(e.target.checked)} className="accent-[var(--neg)]" />
          Drawdown overlay
        </label>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--neg)" stopOpacity={0} />
              <stop offset="100%" stopColor="var(--neg)" stopOpacity={0.18} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} minTickGap={40} />
          <YAxis tickFormatter={formatY} tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
          {viewMode === "balance" && <ReferenceLine y={startingBalance} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {viewMode !== "balance" && <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3" />}
          {showDrawdown && (
            <Area type="monotone" dataKey="drawdown" stroke="none" fill="url(#drawdownGradient)" isAnimationActive={false} />
          )}
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#equityGradient)"
            animationDuration={500}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          {series.length > 12 && (
            <Brush
              dataKey="label"
              height={22}
              stroke="var(--border-strong)"
              fill="var(--surface)"
              travellerWidth={8}
              tickFormatter={() => ""}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
