"use client";

import { Bell, TrendingUp, ShieldAlert, AlertTriangle, BookText, Flame, Award } from "lucide-react";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/lib/types";

const ICONS: Record<NotificationItem["type"], React.ReactNode> = {
  summary: <TrendingUp size={15} className="text-accent" />,
  risk: <ShieldAlert size={15} className="text-warning" />,
  drawdown: <AlertTriangle size={15} className="text-neg" />,
  reminder: <BookText size={15} className="text-text-secondary" />,
  streak: <Flame size={15} className="text-warning" />,
  milestone: <Award size={15} className="text-accent" />,
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsPanel() {
  const notifications = useAppStore((s) => s.notifications);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu
      className="w-[340px] p-0"
      trigger={
        <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors">
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
          )}
        </button>
      }
    >
      {() => (
        <div className="w-[340px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-[13px] font-semibold text-text-primary">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[12px] font-medium text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-8 text-center text-[13px] text-text-tertiary">You&apos;re all caught up.</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-surface-2",
                  !n.read && "bg-accent-soft/30"
                )}
              >
                <div className="mt-0.5 shrink-0">{ICONS[n.type]}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text-primary">{n.title}</p>
                  <p className="mt-0.5 text-[12px] text-text-secondary">{n.body}</p>
                  <p className="mt-1 text-[11px] text-text-tertiary">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </DropdownMenu>
  );
}
