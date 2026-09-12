"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  children,
  className,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[92vw]",
  }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "relative w-full my-0 sm:my-auto rounded-none sm:rounded-lg border border-border bg-surface shadow-[var(--shadow-modal)] animate-slide-up min-h-full sm:min-h-0",
          sizeClasses,
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ModalHeader({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-text-primary">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-text-secondary">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-2 hover:text-text-primary transition-colors"
        aria-label="Close"
      >
        <X size={18} />
      </button>
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
      {children}
    </div>
  );
}
