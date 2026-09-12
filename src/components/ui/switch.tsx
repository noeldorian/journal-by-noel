"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5.5 w-9.5 h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/30",
        checked ? "bg-accent" : "bg-surface-2 border border-border-strong",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-sm transition-transform duration-150",
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border transition-colors duration-150",
        checked ? "bg-accent border-accent" : "bg-bg-elevated border-border-strong",
        className
      )}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="var(--accent-foreground)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
