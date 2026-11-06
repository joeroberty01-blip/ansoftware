"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Bell,
  Plus,
  ChevronDown,
  LogOut,
} from "@/components/icons";
import { Sidebar } from "./sidebar";
import { TopNav } from "./top-nav";
import type { UserRole } from "@/lib/types";

const CREATE_LINKS = [
  { label: "New Patient", href: "/patients/new" },
  { label: "New Home Visit", href: "/home-visits/new" },
  { label: "New Booking", href: "/bookings/new" },
  { label: "New Invoice/Quotation", href: "/billing/new" },
  { label: "New Inventory Item", href: "/inventory/new" },
];

export function DashboardShell({
  fullName,
  role,
  canBilling,
  canClinical,
  pendingStaffCount,
  lowStockCount,
  outstandingCount,
  newBookingsCount,
  notificationCount,
  children,
}: {
  fullName: string;
  role: UserRole;
  canBilling: boolean;
  canClinical: boolean;
  pendingStaffCount: number;
  lowStockCount: number;
  outstandingCount: number;
  newBookingsCount: number;
  notificationCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/patients?search=${encodeURIComponent(search.trim())}`);
      setSidebarOpen(false);
    }
  };

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-zinc-200/80 bg-white/90 px-4 backdrop-blur sm:px-6 print:hidden">
          <button
            type="button"
            className="text-zinc-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-afyanyumbani-mark.png"
              alt=""
              className="h-9 w-9 object-contain"
            />
            <span className="hidden leading-tight sm:block lg:hidden xl:block">
              <span className="font-display block text-[15px] font-bold">
                <span className="text-zinc-900">Afya</span>{" "}
                <span className="text-brand-orange">Nyumbani</span>
              </span>
              <span className="block text-[10px] text-zinc-400">
                {role === "ADMIN" ? "Care that comes home" : "Staff Portal"}
              </span>
            </span>
          </Link>

          <TopNav
            role={role}
            canBilling={canBilling}
            canClinical={canClinical}
            badges={{
              pendingStaff: pendingStaffCount,
              lowStock: lowStockCount,
              outstanding: outstandingCount,
              newBookings: newBookingsCount,
            }}
          />

          <form
            onSubmit={onSearchSubmit}
            className="ml-auto hidden w-64 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 xl:flex"
          >
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients, staff, invoices..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3 xl:ml-0">
            <button
              type="button"
              className="relative rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setCreateOpen((v) => !v)}
                className="flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {createOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setCreateOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                    {CREATE_LINKS.filter(
                      (link) =>
                        role === "ADMIN" ||
                        (link.href !== "/patients/new" && link.href !== "/bookings/new")
                    ).map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setCreateOpen(false)}
                        className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue-light text-sm font-semibold text-brand-blue">
                  {fullName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium text-zinc-900">
                    {fullName}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {role === "ADMIN" ? "Super Administrator" : "Staff"}
                  </span>
                </span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-zinc-400 sm:block" />
              </button>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

      <div className="flex flex-1">
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-16 z-40 bg-black/30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-16 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:hidden print:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            role={role}
            canBilling={canBilling}
            canClinical={canClinical}
            pendingStaffCount={pendingStaffCount}
            lowStockCount={lowStockCount}
            outstandingCount={outstandingCount}
            newBookingsCount={newBookingsCount}
            onNavigate={() => setSidebarOpen(false)}
          />

          <div className="border-t border-zinc-200 p-3">
            <a
              href="mailto:support@afyanyumbani.com"
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-3 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark"
            >
              Need Help? Contact Support
            </a>
          </div>
        </aside>

        <main className="min-w-0 flex-1 print:bg-white">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
