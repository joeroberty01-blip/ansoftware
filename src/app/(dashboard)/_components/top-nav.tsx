"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react/ssr";
import { NAV_ITEMS, type NavItem } from "./sidebar";
import type { UserRole } from "@/lib/types";

const GROUP_ORDER: { key: NavItem["group"]; label: (role: UserRole) => string }[] = [
  { key: "main", label: () => "Care" },
  { key: "billing", label: (role) => (role === "ADMIN" ? "Finance" : "Operations") },
  { key: "other", label: () => "More" },
];

function hrefOf(item: NavItem, role: UserRole) {
  return typeof item.href === "function" ? item.href(role) : item.href;
}

/**
 * Horizontal navigation for desktop: Dashboard as a direct link, then the
 * remaining pages grouped into drop-down panels (Care / Finance / More).
 */
export function TopNav({
  role,
  canBilling,
  canClinical,
  badges,
}: {
  role: UserRole;
  canBilling: boolean;
  canClinical: boolean;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items = NAV_ITEMS.filter((item) => {
    if (item.hideForStaff && role === "STAFF") return false;
    if (item.area === "billing" && !canBilling) return false;
    if (item.area === "clinical" && !canClinical) return false;
    return true;
  });

  const dashboard = items.find((i) => i.href === "/dashboard");
  const isActivePath = (href: string) => {
    const base = href.split("?")[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  };

  return (
    <nav ref={wrapRef} className="hidden items-center gap-1 lg:flex">
      {dashboard && (
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            isActivePath("/dashboard")
              ? "bg-brand-blue text-white"
              : "text-zinc-600 hover:bg-brand-blue-light hover:text-brand-blue"
          }`}
        >
          <dashboard.icon className="h-[18px] w-[18px]" />
          Dashboard
        </Link>
      )}

      {GROUP_ORDER.map((group) => {
        const groupItems = items.filter(
          (i) => i.group === group.key && i.href !== "/dashboard"
        );
        if (groupItems.length === 0) return null;
        const groupBadge = groupItems.reduce(
          (sum, i) => sum + (i.badgeKey ? badges[i.badgeKey] ?? 0 : 0),
          0
        );
        const active = groupItems.some((i) => isActivePath(hrefOf(i, role)));
        const isOpen = open === group.key;
        return (
          <div key={group.key} className="relative">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : group.key)}
              aria-expanded={isOpen}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-blue-light text-brand-blue"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {group.label(role)}
              {groupBadge > 0 && (
                <span className="rounded-full bg-brand-orange px-1.5 text-[10px] font-bold text-white">
                  {groupBadge}
                </span>
              )}
              <CaretDown
                weight="bold"
                className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <div className="absolute left-0 z-50 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg">
                {groupItems.map((item) => {
                  const href = hrefOf(item, role);
                  const Icon = item.icon;
                  const badge = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
                  const label =
                    role !== "ADMIN" && item.labelForStaff ? item.labelForStaff : item.label;
                  const itemActive = isActivePath(href);
                  return (
                    <Link
                      key={item.label}
                      href={href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        itemActive
                          ? "bg-brand-blue-light text-brand-blue"
                          : "text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          itemActive
                            ? "bg-brand-blue text-white"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1">{label}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-brand-orange-light px-2 py-0.5 text-xs font-semibold text-brand-orange">
                          {badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
