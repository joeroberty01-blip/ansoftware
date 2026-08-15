"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  MapPinned,
  FileWarning,
  Wallet,
  Plus,
  Package,
} from "lucide-react";

interface VisitItem {
  id: string;
  patient_id: string;
  patient_name: string;
  status: string;
  location: string | null;
  visit_date: string;
}

interface DutyItem {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
}

interface InventoryUsageItem {
  item_id: string;
  item_name: string;
  unit: string;
  used_this_month: string;
  available: string;
}

interface ExpenseItem {
  id: string;
  category: string;
  amount: string;
  date: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface Overview {
  fullName: string;
  patientsToday: number;
  visitsToday: number;
  visitsTodayDelta: number;
  pendingReportsCount: number;
  expensesThisMonth: string;
  expenseChangePct: number | null;
  todaysVisits: VisitItem[];
  upcomingVisits: VisitItem[];
  reportsToComplete: VisitItem[];
  dutiesToday: DutyItem[];
  inventoryUsage: InventoryUsageItem[];
  recentExpenses: ExpenseItem[];
}

const EXPENSE_CATEGORIES = [
  { value: "USAFIRI", label: "Usafiri (Transport)" },
  { value: "VIFAA", label: "Vifaa (Supplies)" },
  { value: "UENDESHAJI", label: "Uendeshaji (Operations)" },
  { value: "MENGINEYO", label: "Mengineyo (Other)" },
];

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(
    Number(value)
  );
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function VisitStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    COMPLETED: "bg-green-100 text-green-700",
    SCHEDULED: "bg-amber-100 text-amber-700",
    CANCELLED: "bg-zinc-100 text-zinc-600",
  };
  const labels: Record<string, string> = {
    COMPLETED: "Completed",
    SCHEDULED: "Pending",
    CANCELLED: "Cancelled",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-zinc-100 text-zinc-600"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function StaffPortalDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [dutyBusyId, setDutyBusyId] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expCategory, setExpCategory] = useState("USAFIRI");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(todayDateInput());
  const [expDescription, setExpDescription] = useState("");
  const [expError, setExpError] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/staff-portal/overview");
    const json = await res.json();
    setData(json);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onToggleDuty = async (duty: DutyItem) => {
    setDutyBusyId(duty.id);
    try {
      const nextStatus = duty.status === "COMPLETED" ? "PENDING" : "COMPLETED";
      await fetch(`/api/staff/me/duties/${duty.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } finally {
      setDutyBusyId(null);
    }
  };

  const onAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    setSavingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expCategory,
          amount: expAmount,
          date: expDate,
          description: expDescription,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setExpError(json.error ?? "Failed to record expense.");
        return;
      }
      setExpAmount("");
      setExpDescription("");
      setShowExpenseForm(false);
      await load();
    } catch {
      setExpError("Network error.");
    } finally {
      setSavingExpense(false);
    }
  };

  if (!data) {
    return <div className="p-6 text-sm text-zinc-500">Loading...</div>;
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {greeting}, {data.fullName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-zinc-500">
            Here&apos;s what needs your attention today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={
              data.reportsToComplete[0]
                ? `/home-visits/${data.reportsToComplete[0].id}`
                : "/home-visits"
            }
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-2 text-xs font-medium text-white hover:bg-brand-blue-dark sm:text-sm"
          >
            <Plus className="h-4 w-4" /> New Report
          </Link>
          <button
            onClick={() => setShowExpenseForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 sm:text-sm"
          >
            <Plus className="h-4 w-4" /> Record Expense
          </button>
          <Link
            href="/inventory"
            className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-xs font-medium text-white hover:bg-brand-orange-dark sm:text-sm"
          >
            <Plus className="h-4 w-4" /> Record Inventory
          </Link>
        </div>
      </div>

      {showExpenseForm && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Record Expense (sent to Admin for approval)
          </h2>
          <form
            onSubmit={onAddExpense}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              required
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              value={expDescription}
              onChange={(e) => setExpDescription(e.target.value)}
              placeholder="Description"
              required
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={savingExpense}
              className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {savingExpense ? "Saving..." : "Submit"}
            </button>
          </form>
          {expError && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {expError}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="rounded-lg bg-brand-blue-light p-1.5 text-brand-blue">
              <Users className="h-4 w-4" />
            </span>
            Patients Today
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{data.patientsToday}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="rounded-lg bg-green-100 p-1.5 text-green-700">
              <MapPinned className="h-4 w-4" />
            </span>
            Visits Today
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">{data.visitsToday}</p>
          {data.visitsTodayDelta !== 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              {data.visitsTodayDelta > 0 ? "+" : ""}
              {data.visitsTodayDelta} from yesterday
            </p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
              <FileWarning className="h-4 w-4" />
            </span>
            Pending Reports
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">
            {data.pendingReportsCount}
          </p>
          {data.pendingReportsCount > 0 && (
            <p className="mt-1 text-xs font-medium text-red-600">Due today</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="rounded-lg bg-purple-100 p-1.5 text-purple-700">
              <Wallet className="h-4 w-4" />
            </span>
            Expenses This Month
          </div>
          <p className="mt-2 text-2xl font-bold text-zinc-900">
            TSh {fmt(data.expensesThisMonth)}
          </p>
          {data.expenseChangePct !== null && (
            <p className="mt-1 text-xs text-zinc-500">
              {data.expenseChangePct > 0 ? "+" : ""}
              {data.expenseChangePct.toFixed(0)}% from last month
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Today&apos;s Visits</h2>
            <Link href="/home-visits" className="text-xs font-medium text-brand-blue">
              View all visits →
            </Link>
          </div>
          {data.todaysVisits.length === 0 ? (
            <p className="text-sm text-zinc-500">No visits scheduled today.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.todaysVisits.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{v.patient_name}</p>
                    <p className="truncate text-xs text-zinc-500">{v.location ?? "-"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <VisitStatusBadge status={v.status} />
                    <Link
                      href={`/home-visits/${v.id}`}
                      className="text-xs font-medium text-brand-blue"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Reports to Complete</h2>
            {data.reportsToComplete.length > 0 && (
              <span className="text-xs font-medium text-red-600">
                {data.reportsToComplete.length} require your attention
              </span>
            )}
          </div>
          {data.reportsToComplete.length === 0 ? (
            <p className="text-sm text-zinc-500">All reports are up to date.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.reportsToComplete.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{v.patient_name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {v.visit_date.slice(0, 10)}
                    </p>
                  </div>
                  <Link
                    href={`/home-visits/${v.id}`}
                    className="shrink-0 text-xs font-medium text-red-600"
                  >
                    Due
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Tasks / Duties</h2>
            <Link href="/staff/me" className="text-xs font-medium text-brand-blue">
              View all →
            </Link>
          </div>
          {data.dutiesToday.length === 0 ? (
            <p className="text-sm text-zinc-500">No tasks due today.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.dutiesToday.map((d) => (
                <li key={d.id} className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => onToggleDuty(d)}
                    disabled={dutyBusyId === d.id}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                      d.status === "COMPLETED"
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-zinc-300"
                    }`}
                  >
                    {d.status === "COMPLETED" ? "✓" : ""}
                  </button>
                  <span
                    className={
                      d.status === "COMPLETED"
                        ? "truncate text-zinc-400 line-through"
                        : "truncate text-zinc-900"
                    }
                  >
                    {d.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Inventory Usage <span className="text-xs font-normal text-zinc-400">This Month</span>
          </h2>
          {data.inventoryUsage.length === 0 ? (
            <p className="text-sm text-zinc-500">No inventory recorded by you this month.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.inventoryUsage.map((item) => {
                const used = Number(item.used_this_month);
                const available = Math.max(Number(item.available), 1);
                const pct = Math.min(100, (used / (used + available)) * 100);
                return (
                  <li key={item.item_id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-900">{item.item_name}</span>
                      <span className="text-zinc-500">
                        {used} used
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100">
                      <div
                        className="h-1.5 rounded-full bg-brand-blue"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      Available: {item.available} {item.unit}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/inventory"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-blue"
          >
            <Package className="h-3.5 w-3.5" /> Record Inventory Usage
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Recent Expenses</h2>
          {data.recentExpenses.length === 0 ? (
            <p className="text-sm text-zinc-500">You haven&apos;t recorded any expenses.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="py-1.5 pr-2 font-medium">Date</th>
                    <th className="py-1.5 pr-2 font-medium">Description</th>
                    <th className="py-1.5 pr-2 text-right font-medium">Amount</th>
                    <th className="py-1.5 pr-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentExpenses.map((e) => (
                    <tr key={e.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-1.5 pr-2">{e.date.slice(0, 10)}</td>
                      <td className="py-1.5 pr-2 truncate">{e.description}</td>
                      <td className="py-1.5 pr-2 text-right font-medium">
                        {fmt(e.amount)}
                      </td>
                      <td className="py-1.5 pr-2">
                        <span
                          className={
                            e.status === "APPROVED"
                              ? "font-medium text-green-700"
                              : e.status === "REJECTED"
                              ? "font-medium text-red-700"
                              : "font-medium text-amber-700"
                          }
                        >
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Upcoming Visits</h2>
            <Link href="/home-visits" className="text-xs font-medium text-brand-blue">
              View calendar →
            </Link>
          </div>
          {data.upcomingVisits.length === 0 ? (
            <p className="text-sm text-zinc-500">No upcoming visits scheduled.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.upcomingVisits.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{v.patient_name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {v.visit_date.slice(0, 10)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-blue-light px-2 py-0.5 text-xs font-medium text-brand-blue">
                    Confirmed
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
