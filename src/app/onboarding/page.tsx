"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ArrowRight, ArrowLeft, Gauge, Timer, TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useAppStore } from "@/lib/store";
import { INSTRUMENT_LIST } from "@/lib/instruments";
import { cn, uid } from "@/lib/utils";
import type { Account, InstrumentSymbol, Priority, TradingStyle } from "@/lib/types";

const STYLES: { value: TradingStyle; desc: string; icon: React.ReactNode }[] = [
  { value: "Scalping", desc: "Seconds to minutes, high frequency", icon: <Gauge size={18} /> },
  { value: "Day Trading", desc: "Intraday, flat by session close", icon: <Timer size={18} /> },
  { value: "Swing Trading", desc: "Multi-day to multi-week holds", icon: <TrendingUp size={18} /> },
];

const PRIORITIES: Priority[] = ["Consistency", "Win rate", "Risk management", "Profitability", "Discipline", "Psychology"];

const STEP_LABELS = ["Instruments", "Style", "Priorities", "First Account"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 text-[13px] font-medium transition-colors",
        active ? "border-accent/40 bg-accent-soft text-accent" : "border-border bg-surface text-text-secondary hover:border-border-strong"
      )}
    >
      {active && <Check size={13} />}
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useAuth();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const addAccount = useAppStore((s) => s.addAccount);
  const setActiveAccount = useAppStore((s) => s.setActiveAccount);
  const hydrated = useAppStore((s) => s.hydrated);

  const [step, setStep] = useState(0);
  const [instruments, setInstruments] = useState<InstrumentSymbol[]>([]);
  const [wantsOther, setWantsOther] = useState(false);
  const [style, setStyle] = useState<TradingStyle | null>(null);
  const [priorities, setPriorities] = useState<Priority[]>([]);

  const [accountName, setAccountName] = useState("My Trading Account");
  const [accountType, setAccountType] = useState<Account["type"]>("Prop Evaluation");
  const [startingBalance, setStartingBalance] = useState("50000");
  const [currency, setCurrency] = useState<Account["currency"]>("USD");
  const [riskPerTrade, setRiskPerTrade] = useState("0.5");
  const [dailyLossLimit, setDailyLossLimit] = useState("1000");
  const [profitTarget, setProfitTarget] = useState("3000");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (user?.onboardingCompleted) router.replace("/dashboard");
  }, [user, router]);

  const progress = useMemo(() => ((step + 1) / STEP_LABELS.length) * 100, [step]);

  function toggleInstrument(sym: InstrumentSymbol) {
    setInstruments((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));
  }
  function togglePriority(p: Priority) {
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : prev.length >= 3 ? prev : [...prev, p]));
  }

  function finish(skippedAccount = false) {
    if (!user) return;
    setUser({
      ...user,
      instrumentsTraded: instruments.length ? instruments : user.instrumentsTraded,
      tradingStyle: style ?? user.tradingStyle,
      priorities: priorities.length ? priorities : user.priorities,
      onboardingCompleted: true,
    });
    if (!skippedAccount && accountName.trim()) {
      const size = Number(startingBalance) || 50000;
      const account: Account = {
        id: uid("acc"),
        name: accountName.trim(),
        type: accountType,
        startingBalance: size,
        currentBalance: size,
        currency,
        accountSize: size,
        riskPerTradePct: Number(riskPerTrade) || 0.5,
        dailyLossLimit: Number(dailyLossLimit) || 0,
        profitTarget: Number(profitTarget) || 0,
        maxDrawdown: Math.round(size * 0.04),
        propFirmMode: accountType === "Prop Evaluation" || accountType === "Prop Funded",
        createdAt: new Date().toISOString(),
      };
      addAccount(account);
      setActiveAccount(account.id);
    }
    router.push("/dashboard");
  }

  function handleSkipAll() {
    finish(true);
  }

  if (status !== "authenticated" || !hydrated || !user) {
    return <div className="flex h-dvh items-center justify-center bg-bg" />;
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex max-w-2xl flex-col px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <button onClick={handleSkipAll} className="text-[13px] font-medium text-text-tertiary hover:text-text-primary">
            Skip onboarding
          </button>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-[12px] text-text-tertiary">
            <span>Step {step + 1} of {STEP_LABELS.length}</span>
            <span>{STEP_LABELS[step]}</span>
          </div>
          <div className="h-1 w-full rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {step === 0 && (
          <section className="animate-fade-in">
            <h1 className="text-[22px] font-semibold text-text-primary">What do you trade?</h1>
            <p className="mt-1.5 text-[13px] text-text-secondary">Select every instrument you actively trade.</p>
            <div className="mt-6 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {INSTRUMENT_LIST.map((i) => (
                <Chip key={i.symbol} active={instruments.includes(i.symbol)} onClick={() => toggleInstrument(i.symbol)}>
                  {i.symbol}
                </Chip>
              ))}
              <Chip active={wantsOther} onClick={() => setWantsOther((v) => !v)}>Other</Chip>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="animate-fade-in">
            <h1 className="text-[22px] font-semibold text-text-primary">What is your trading style?</h1>
            <p className="mt-1.5 text-[13px] text-text-secondary">This helps tailor default session and risk settings.</p>
            <div className="mt-6 space-y-2.5">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-lg border px-4 py-3.5 text-left transition-colors",
                    style === s.value ? "border-accent/40 bg-accent-soft" : "border-border bg-surface hover:border-border-strong"
                  )}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-md", style === s.value ? "bg-accent text-accent-foreground" : "bg-surface-2 text-text-secondary")}>
                    {s.icon}
                  </span>
                  <span className="flex-1">
                    <p className="text-[14px] font-medium text-text-primary">{s.value}</p>
                    <p className="text-[12.5px] text-text-secondary">{s.desc}</p>
                  </span>
                  {style === s.value && <Check size={16} className="text-accent" />}
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="animate-fade-in">
            <h1 className="text-[22px] font-semibold text-text-primary">What matters most to you?</h1>
            <p className="mt-1.5 text-[13px] text-text-secondary">Pick up to three — we&apos;ll surface insights around these.</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {PRIORITIES.map((p) => (
                <Chip key={p} active={priorities.includes(p)} onClick={() => togglePriority(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="animate-fade-in">
            <h1 className="text-[22px] font-semibold text-text-primary">Create your first trading account</h1>
            <p className="mt-1.5 text-[13px] text-text-secondary">e.g. &ldquo;Topstep 50K&rdquo; or &ldquo;Personal Futures Account&rdquo;.</p>
            <div className="mt-6 space-y-4">
              <div>
                <Label>Account name</Label>
                <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Topstep 50K" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Account type</Label>
                  <Select value={accountType} onChange={(e) => setAccountType(e.target.value as Account["type"])}>
                    <option>Prop Evaluation</option>
                    <option>Prop Funded</option>
                    <option>Personal</option>
                    <option>Demo</option>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value as Account["currency"])}>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Starting balance</Label>
                  <Input type="number" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
                </div>
                <div>
                  <Label>Risk per trade (%)</Label>
                  <Input type="number" step="0.1" value={riskPerTrade} onChange={(e) => setRiskPerTrade(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Daily loss limit ($)</Label>
                  <Input type="number" value={dailyLossLimit} onChange={(e) => setDailyLossLimit(e.target.value)} />
                </div>
                <div>
                  <Label>Profit target ($)</Label>
                  <Input type="number" value={profitTarget} onChange={(e) => setProfitTarget(e.target.value)} />
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Button variant="tertiary" onClick={() => setStep((s) => Math.max(0, s - 1))} className={cn(step === 0 && "invisible")}>
            <ArrowLeft size={15} /> Back
          </Button>
          {step < STEP_LABELS.length - 1 ? (
            <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight size={15} />
            </Button>
          ) : (
            <Button variant="primary" onClick={() => finish(false)}>
              Finish setup <Check size={15} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
