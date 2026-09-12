import {
  LayoutDashboard,
  BookText,
  BarChart3,
  CalendarDays,
  ListChecks,
  Brain,
  Wallet,
  ShieldAlert,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Journal", href: "/journal", icon: BookText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Playbook", href: "/playbook", icon: ListChecks },
  { label: "Psychology", href: "/psychology", icon: Brain },
  { label: "Accounts", href: "/accounts", icon: Wallet },
  { label: "Risk", href: "/risk", icon: ShieldAlert },
  { label: "Settings", href: "/settings", icon: Settings },
];
