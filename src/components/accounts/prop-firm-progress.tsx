import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { computePropFirmSnapshot } from "@/lib/prop-firm";
import type { Account, Trade } from "@/lib/types";

const STATUS_LABEL = { safe: "Safe", warning: "Warning", critical: "Critical" } as const;
const STATUS_TONE = { safe: "pos", warning: "warning", critical: "neg" } as const;

export function PropFirmProgress({ account, trades }: { account: Account; trades: Trade[] }) {
  const snap = computePropFirmSnapshot(account, trades);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] font-medium text-text-secondary">Prop Firm Status</p>
        <Badge tone={STATUS_TONE[snap.status]}>{STATUS_LABEL[snap.status]}</Badge>
      </div>

      {account.profitTarget > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-text-tertiary">Progress to Target</span>
            <span className="font-medium text-text-primary">
              {formatCurrency(Math.max(0, account.profitTarget - snap.amountToTarget), { showSign: false })} / {formatCurrency(account.profitTarget, { showSign: false })}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.min(100, Math.max(0, snap.progressToTarget))}%` }} />
          </div>
        </div>
      )}

      {account.maxDrawdown > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-text-tertiary">Drawdown Remaining</span>
            <span className="font-medium text-text-primary">{formatCurrency(snap.drawdownRemaining, { showSign: false })}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className={`h-full rounded-full transition-all ${snap.drawdownPct >= 80 ? "bg-neg" : snap.drawdownPct >= 50 ? "bg-warning" : "bg-pos"}`} style={{ width: `${Math.min(100, snap.drawdownPct)}%` }} />
          </div>
        </div>
      )}

      {account.dailyLossLimit > 0 && (
        <div>
          <div className="mb-1 flex items-center justify-between text-[12px]">
            <span className="text-text-tertiary">Daily Loss Remaining</span>
            <span className="font-medium text-text-primary">{formatCurrency(snap.dailyLossRemaining, { showSign: false })}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className={`h-full rounded-full transition-all ${snap.dailyLossPct >= 80 ? "bg-neg" : snap.dailyLossPct >= 50 ? "bg-warning" : "bg-pos"}`} style={{ width: `${Math.min(100, snap.dailyLossPct)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
