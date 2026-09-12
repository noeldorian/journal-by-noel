"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-2 min-w-[200px] rounded-lg border border-border bg-surface p-1.5 shadow-[var(--shadow-modal)] animate-scale-in origin-top-right",
            align === "end" ? "right-0" : "left-0",
            className
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  icon,
  danger,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-100",
        danger ? "text-neg hover:bg-neg/10" : "text-text-primary hover:bg-surface-2"
      )}
    >
      {icon && <span className="text-text-tertiary">{icon}</span>}
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-border" />;
}
