"use client";

import { useMemo } from "react";
import { Quote as QuoteIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TiltCard } from "@/components/quote/tilt-card";
import { TRADING_QUOTES, quoteOfTheDay } from "@/lib/quotes";
import { formatDate, todayLocalDateStr } from "@/lib/utils";

export default function QuotePage() {
  const today = todayLocalDateStr();
  const quote = useMemo(() => quoteOfTheDay(today), [today]);

  // A few other quotes for browsing, deterministically picked so the list
  // doesn't reshuffle every time this page renders — just excludes today's.
  const others = useMemo(
    () => TRADING_QUOTES.filter((q) => q.text !== quote.text).slice(0, 6),
    [quote]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-[19px] font-semibold text-text-primary">Daily Quote</h2>
        <p className="text-[13px] text-text-secondary">{formatDate(today, { weekday: "long" })} — a new one every day.</p>
      </div>

      <TiltCard className="mx-auto">
        <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-gradient-to-br from-surface to-bg-elevated p-8 shadow-[var(--shadow-modal)] sm:p-10">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20 blur-2xl"
            style={{ background: "conic-gradient(from 0deg, var(--accent), var(--accent-2), var(--accent-3), var(--accent))" }}
          />
          <QuoteIcon size={28} className="mb-5 text-accent" style={{ transform: "translateZ(30px)" }} />
          <p
            className="text-[20px] font-medium leading-snug text-text-primary [text-wrap:balance] sm:text-[24px]"
            style={{ transform: "translateZ(24px)" }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="mt-5 text-[13.5px] font-medium text-text-secondary" style={{ transform: "translateZ(16px)" }}>
            — {quote.author}
          </p>
        </div>
      </TiltCard>

      <div>
        <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">More to sit with</h3>
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {others.map((q) => (
              <div key={q.text} className="px-5 py-3.5">
                <p className="text-[13.5px] text-text-secondary">&ldquo;{q.text}&rdquo;</p>
                <p className="mt-1 text-[12px] text-text-tertiary">— {q.author}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
