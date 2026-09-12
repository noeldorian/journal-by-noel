"use client";

import { createContext, useCallback, useContext, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-pos" />,
  error: <XCircle size={18} className="text-neg" />,
  warning: <AlertTriangle size={18} className="text-warning" />,
  info: <Info size={18} className="text-accent" />,
};

function subscribeNoop() {
  return () => {};
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // document.body doesn't exist during SSR. useSyncExternalStore lets us
  // report "false" for the server snapshot and "true" once client-rendered
  // without a hydration mismatch (unlike branching on typeof document).
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-2.5rem)]">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-[var(--shadow-modal)] animate-slide-up"
                )}
              >
                <div className="mt-0.5 shrink-0">{icons[t.tone]}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[12px] text-text-secondary">{t.description}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="text-text-tertiary hover:text-text-primary">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
