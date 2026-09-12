import { cn } from "@/lib/utils";

type Tone = "neutral" | "pos" | "neg" | "warning" | "accent";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-2 text-text-secondary border-border-strong",
  pos: "bg-pos-soft text-pos border-pos/20",
  neg: "bg-neg-soft text-neg border-neg/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  accent: "bg-accent-soft text-accent border-accent/20",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-medium leading-5 whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
