"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Users,
  CalendarCheck,
  HeartPulse,
  MapPinned,
  Package,
  BarChart3,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

interface NavItem {
  label: string;
  href: string | ((role: UserRole) => string);
  icon: LucideIcon;
  hideForStaff?: boolean;
  badgeKey?: "pendingStaff" | "lowStock" | "outstanding";
  group: "main" | "billing" | "other";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "main" },
  { label: "Patients", href: "/patients", icon: HeartPulse, group: "main" },
  {
    label: "Bookings",
    href: `/coming-soon?feature=${encodeURIComponent("Bookings")}`,
    icon: CalendarCheck,
    group: "main",
  },
  { label: "Home Visits", href: "/home-visits", icon: MapPinned, group: "main" },
  {
    label: "Staff",
    href: (role) => (role === "ADMIN" ? "/staff" : "/staff/me"),
    icon: Users,
    badgeKey: "pendingStaff",
    group: "main",
  },
  {
    label: "Finance/Accounting",
    href: "/finance",
    icon: Wallet,
    hideForStaff: true,
    group: "billing",
  },
  {
    label: "Billing/Invoices",
    href: "/billing",
    icon: Receipt,
    hideForStaff: true,
    badgeKey: "outstanding",
    group: "billing",
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    badgeKey: "lowStock",
    group: "billing",
  },
  {
    label: "Reports",
    href: `/coming-soon?feature=${encodeURIComponent("Reports")}`,
    icon: BarChart3,
    hideForStaff: true,
    group: "other",
  },
  {
    label: "Documents",
    href: `/coming-soon?feature=${encodeURIComponent("Documents")}`,
    icon: FileText,
    group: "other",
  },
  {
    label: "Settings",
    href: `/coming-soon?feature=${encodeURIComponent("Settings")}`,
    icon: Settings,
    group: "other",
  },
];

export function Sidebar({
  role,
  pendingStaffCount = 0,
  lowStockCount = 0,
  outstandingCount = 0,
  onNavigate,
}: {
  role: UserRole;
  pendingStaffCount?: number;
  lowStockCount?: number;
  outstandingCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  const badgeValues: Record<string, number> = {
    pendingStaff: pendingStaffCount,
    lowStock: lowStockCount,
    outstanding: outstandingCount,
  };

  const items = NAV_ITEMS.filter(
    (item) => !(item.hideForStaff && role === "STAFF")
  );

  const groups: { key: NavItem["group"]; label: string }[] = [
    { key: "main", label: "Huduma" },
    { key: "billing", label: "Fedha" },
    { key: "other", label: "Nyingine" },
  ];

  return (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
      {groups.map((group) => {
        const groupItems = items.filter((i) => i.group === group.key);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.key} className="flex flex-col gap-1">
            <p className="px-3 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              {group.label}
            </p>
            {groupItems.map((item) => {
              const href =
                typeof item.href === "function" ? item.href(role) : item.href;
              const [itemPath, itemQuery] = href.split("?");
              const isActive = itemQuery
                ? pathname === itemPath && currentSearch === itemQuery
                : pathname === itemPath;
              const Icon = item.icon;
              const badge = item.badgeKey ? badgeValues[item.badgeKey] : 0;
              return (
                <Link
                  key={item.label}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-blue text-white"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-brand-orange-light text-brand-orange"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
