import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-16 text-center", className)}>
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 border border-border text-text-secondary">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[15px] font-medium text-text-primary">{title}</p>
        {description && <p className="max-w-sm text-[13px] text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
