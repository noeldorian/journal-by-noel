"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function BreakdownBarChart({
  data,
  labelKey = "key",
  valueKey = "netPnl",
  height = 260,
  valueFormatter,
}: {
  data: Record<string, unknown>[];
  labelKey?: string;
  valueKey?: string;
  height?: number;
  valueFormatter?: (v: number) => string;
}) {
  const format = valueFormatter ?? ((v: number) => formatCurrency(v));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey={labelKey} tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tick={{ fill: "var(--text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} width={48} />
        <ReferenceLine y={0} stroke="var(--border-strong)" />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Record<string, number | string>;
            const val = Number(p[valueKey]);
            return (
              <div className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] shadow-[var(--shadow-modal)]">
                <p className="font-medium text-text-primary">{String(p[labelKey])}</p>
                <p className="text-text-secondary">{format(val)}</p>
              </div>
            );
          }}
        />
        <Bar dataKey={valueKey} radius={[3, 3, 3, 3]} maxBarSize={36}>
          {data.map((d, i) => (
            <Cell key={i} fill={Number(d[valueKey]) >= 0 ? "var(--pos)" : "var(--neg)"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
