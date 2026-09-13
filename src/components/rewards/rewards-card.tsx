"use client";

import { useState } from "react";
import { Trophy, Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAppStore } from "@/lib/store";
import { redeemRewardPoints } from "@/lib/rewards";
import { REWARD_POINTS_REDEMPTION_COST } from "@/lib/types";

export function RewardsCard() {
  const balance = useAppStore((s) => s.rewardPoints.balance);
  const refreshSubscription = useAppStore((s) => s.refreshSubscription);
  const refreshRewardPoints = useAppStore((s) => s.refreshRewardPoints);
  const { push } = useToast();
  const [redeeming, setRedeeming] = useState(false);

  const pct = Math.min(100, (balance / REWARD_POINTS_REDEMPTION_COST) * 100);
  const canRedeem = balance >= REWARD_POINTS_REDEMPTION_COST;

  async function handleRedeem() {
    setRedeeming(true);
    try {
      await redeemRewardPoints();
      await Promise.all([refreshRewardPoints(), refreshSubscription()]);
      push({ title: "Redeemed!", description: "A free month of Premium just landed on your account.", tone: "success" });
    } catch (err) {
      push({ title: "Couldn't redeem", description: err instanceof Error ? err.message : "Something went wrong.", tone: "error" });
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Trophy size={20} />
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[13px] font-medium text-text-primary">
              Reward points — <span className="tabular-nums-all">{balance}</span> / {REWARD_POINTS_REDEMPTION_COST}
            </p>
            <p className="text-[11.5px] text-text-tertiary">Earned by logging a disciplined day</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <Button variant={canRedeem ? "primary" : "secondary"} size="sm" disabled={!canRedeem || redeeming} onClick={handleRedeem}>
          <Gift size={14} /> {canRedeem ? (redeeming ? "Redeeming…" : "Redeem for 1 month free") : `${REWARD_POINTS_REDEMPTION_COST - balance} to go`}
        </Button>
      </CardContent>
    </Card>
  );
}
