"use client";

import { useRouter } from "next/navigation";
import { CalendarHeart, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { mondayOf, traderArchetype, computeWeekStats } from "@/lib/weekly-review";
import { todayLocalDateStr } from "@/lib/utils";

export function SundayReviewBanner() {
  const router = useRouter();
  const trades = useAppStore((s) => s.trades);
  const checkIns = useAppStore((s) => s.checkIns);
  const weeklyReviews = useAppStore((s) => s.weeklyReviews);

  const thisWeekStart = mondayOf(todayLocalDateStr());
  const isSunday = new Date(todayLocalDateStr() + "T00:00:00").getDay() === 0;
  const alreadySaved = weeklyReviews.some((w) => w.weekStart === thisWeekStart);
  const stats = computeWeekStats(trades, checkIns, thisWeekStart);
  const archetype = traderArchetype(stats);

  return (
    <Card className={isSunday && !alreadySaved ? "border-accent/30" : undefined}>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[20px]">
            {alreadySaved ? archetype.emoji : "📝"}
          </div>
          <div>
            <p className="text-[13px] font-medium text-text-primary">
              {isSunday && !alreadySaved ? "It's Sunday — time for your weekly review" : alreadySaved ? `This week: ${archetype.name}` : "Sunday Review"}
            </p>
            <p className="text-[11.5px] text-text-tertiary">
              {alreadySaved ? "Saved — revisit or update it any time." : "A five-minute recap and reflection on your trading week."}
            </p>
          </div>
        </div>
        <Button variant={isSunday && !alreadySaved ? "primary" : "secondary"} size="sm" onClick={() => router.push("/weekly-review")}>
          <CalendarHeart size={14} /> {alreadySaved ? "View review" : "Start review"} <ArrowRight size={13} />
        </Button>
      </CardContent>
    </Card>
  );
}
