"use client";

import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md bg-surface-2 p-1 border border-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative rounded-[5px] px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
            value === tab.value
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-text-tertiary">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Pill({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors duration-150",
        active
          ? "bg-accent-soft border-accent/30 text-accent"
          : "bg-transparent border-border text-text-secondary hover:border-border-strong hover:text-text-primary",
        className
      )}
    >
      {children}
    </button>
  );
}
