import { cn } from "@/lib/utils";

export function Logomark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("shrink-0", className)}>
      <rect x="1" y="1" width="30" height="30" rx="8" className="fill-surface-2 stroke-border-strong" strokeWidth="1" />
      <path
        d="M9 20.5L13.2 15.8L16.6 18.6L23 10.5"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M19.5 10.5H23V14" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ className, iconClassName }: { className?: string; iconClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logomark className={cn("h-8 w-8", iconClassName)} />
      <span className="text-[15px] font-semibold tracking-tight text-text-primary">
        Journal <span className="text-text-secondary font-normal">by Noel</span>
      </span>
    </div>
  );
}
