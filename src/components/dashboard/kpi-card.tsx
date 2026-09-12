"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  format,
  trendLabel,
  trendDirection,
  valueClassName,
  sub,
}: {
  label: string;
  value: number;
  format: (v: number) => string;
  trendLabel?: string;
  trendDirection?: "up" | "down" | "flat";
  valueClassName?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong">
      <p className="text-[12px] font-medium uppercase tracking-wide text-text-secondary">{label}</p>
      <div className={cn("mt-2 text-[22px] font-semibold leading-none", valueClassName)}>
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="mt-2 flex items-center gap-1 min-h-[16px]">
        {trendLabel && (
          <>
            {trendDirection === "up" && <ArrowUpRight size={13} className="text-pos" />}
            {trendDirection === "down" && <ArrowDownRight size={13} className="text-neg" />}
            {trendDirection === "flat" && <Minus size={13} className="text-text-tertiary" />}
            <span
              className={cn(
                "text-[12px] font-medium",
                trendDirection === "up" && "text-pos",
                trendDirection === "down" && "text-neg",
                trendDirection === "flat" && "text-text-tertiary"
              )}
            >
              {trendLabel}
            </span>
          </>
        )}
        {sub && <span className="text-[12px] text-text-tertiary">{sub}</span>}
      </div>
    </div>
  );
}
