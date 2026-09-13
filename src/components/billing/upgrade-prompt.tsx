"use client";

import { Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/lib/use-billing";

export function UpgradePrompt({ title, description }: { title: string; description: string }) {
  const { startCheckout, loading, error } = useBilling();

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-accent/25 bg-accent-soft px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Sparkles size={20} />
      </div>
      <div>
        <p className="text-[15px] font-semibold text-text-primary">{title}</p>
        <p className="mt-1 max-w-sm text-[13px] text-text-secondary">{description}</p>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-neg/30 bg-neg-soft px-3 py-2 text-[12.5px] text-neg">
          <AlertCircle size={14} className="shrink-0" /> {error}
        </div>
      )}
      <Button variant="primary" onClick={startCheckout} loading={loading === "checkout"}>
        Upgrade to Premium — $15/mo
      </Button>
    </div>
  );
}
