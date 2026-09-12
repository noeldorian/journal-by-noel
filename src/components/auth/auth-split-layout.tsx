import { Logo } from "@/components/logo";
import { TrendingUp, ShieldCheck, LineChart } from "lucide-react";

function EquitySvg() {
  return (
    <svg viewBox="0 0 400 180" fill="none" className="w-full max-w-md">
      <defs>
        <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 140 L30 132 L60 138 L90 108 L120 116 L150 84 L180 96 L210 62 L240 70 L270 40 L300 52 L330 24 L360 34 L400 8 L400 180 L0 180 Z"
        fill="url(#equity-fill)"
      />
      <path
        d="M0 140 L30 132 L60 138 L90 108 L120 116 L150 84 L180 96 L210 62 L240 70 L270 40 L300 52 L330 24 L360 34 L400 8"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full bg-bg">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-border bg-bg-elevated p-10 lg:flex xl:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,229,160,0.06),transparent_55%)]" />
        <div className="relative z-10">
          <Logo />
        </div>

        <div className="relative z-10 space-y-8">
          <EquitySvg />
          <div className="max-w-sm space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
              Trade with data, not emotion.
            </h2>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              Journal every futures trade, track your edge across setups and sessions, and see
              exactly what&apos;s working — before your next trade, not after.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-6 text-text-tertiary">
          <div className="flex items-center gap-2 text-[12px]">
            <LineChart size={15} className="text-accent" /> Real-time analytics
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <ShieldCheck size={15} className="text-accent" /> Bank-grade security
          </div>
          <div className="flex items-center gap-2 text-[12px]">
            <TrendingUp size={15} className="text-accent" /> Built for prop traders
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
