"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ExpenseCategory, PaymentMethod } from "@/lib/types";
import { ListToolbar } from "../_components/list-toolbar";
import {
  Wallet,
  TrendingUp,
  PieChart,
  FileText,
  Receipt,
  BarChart3,
  ChevronRight,
  RotateCcw,
  Paperclip,
  Search,
} from "lucide-react";

interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  description: string;
  payment_method: PaymentMethod | null;
  attachment_url: string | null;
}

const CSV_COLUMNS = [
  { key: "date", label: "Tarehe" },
  { key: "category", label: "Category" },
  { key: "description", label: "Maelezo" },
  { key: "amount", label: "Kiasi" },
  { key: "payment_method", label: "Payment Method" },
];

interface Summary {
  from: string;
  to: string;
  income: string;
  expenses: string;
  netProfit: string;
  outstandingInvoices: number;
}

interface CategoryBreakdown {
  category: string;
  total: string;
}

type Period = "today" | "week" | "month";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Leo" },
  { value: "week", label: "Wiki Hii" },
  { value: "month", label: "Mwezi Huu" },
];

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "MISHAHARA", label: "Mishahara" },
  { value: "VIFAA", label: "Vifaa" },
  { value: "USAFIRI", label: "Usafiri" },
  { value: "UENDESHAJI", label: "Uendeshaji" },
  { value: "MENGINEYO", label: "Mengineyo" },
];

const CATEGORY_LABELS = Object.fromEntries(
  CATEGORY_OPTIONS.map((c) => [c.value, c.label])
) as Record<ExpenseCategory, string>;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  MISHAHARA: { bg: "bg-green-100", text: "text-green-700", dot: "#16a34a" },
  VIFAA: { bg: "bg-blue-100", text: "text-blue-700", dot: "#2563eb" },
  USAFIRI: { bg: "bg-teal-100", text: "text-teal-700", dot: "#0d9488" },
  UENDESHAJI: { bg: "bg-indigo-100", text: "text-indigo-700", dot: "#4f46e5" },
  MENGINEYO: { bg: "bg-purple-100", text: "text-purple-700", dot: "#9333ea" },
};

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "MPESA", label: "Mpesa" },
  { value: "AIRTEL_MONEY", label: "Airtel Money" },
  { value: "MIXX_BY_YAS", label: "Mixx by Yas" },
];

const PAYMENT_METHOD_LABELS = Object.fromEntries(
  PAYMENT_METHOD_OPTIONS.map((p) => [p.value, p.label])
) as Record<PaymentMethod, string>;

const PAYMENT_METHOD_COLORS: Record<string, { bg: string; text: string }> = {
  CASH: { bg: "bg-orange-100", text: "text-orange-700" },
  BANK_TRANSFER: { bg: "bg-green-100", text: "text-green-700" },
  MPESA: { bg: "bg-purple-100", text: "text-purple-700" },
  AIRTEL_MONEY: { bg: "bg-red-100", text: "text-red-700" },
  MIXX_BY_YAS: { bg: "bg-teal-100", text: "text-teal-700" },
};

function formatMoney(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDateRange(from: string, to: string) {
  const fromD = new Date(from);
  const toD = new Date(new Date(to).getTime() - 86_400_000);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const fromStr = fromD.toLocaleDateString("en-US", opts);
  const toStr = toD.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${fromStr} - ${toStr}`;
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  changePct,
  invertColor = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  changePct: number | null;
  invertColor?: boolean;
}) {
  const isUp = (changePct ?? 0) > 0;
  const isFlat = !changePct;
  const good = invertColor ? !isUp : isUp;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-zinc-900">{value}</p>
        <p className={`mt-0.5 text-xs ${isFlat ? "text-zinc-400" : good ? "text-green-600" : "text-red-600"}`}>
          {changePct === null ? "-" : isFlat ? "↔" : isUp ? "↑" : "↓"}{" "}
          {changePct === null ? "" : `${Math.abs(changePct)}%`} vs mwezi uliopita
        </p>
      </div>
    </div>
  );
}

function CategoryDonut({ breakdown }: { breakdown: CategoryBreakdown[] }) {
  const total = breakdown.reduce((sum, b) => sum + Number(b.total), 0);
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">Hakuna matumizi kwenye kipindi hiki.</p>;
  }
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f4f4f5" strokeWidth="14" />
          {breakdown.map((b) => {
            const value = Number(b.total);
            const fraction = value / total;
            const dash = fraction * circumference;
            const color = CATEGORY_COLORS[b.category]?.dot ?? "#a1a1aa";
            const el = (
              <circle
                key={b.category}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-zinc-400">Jumla</span>
          <span className="text-sm font-bold text-zinc-900">{(total / 1000).toFixed(0)}K</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {breakdown.map((b) => {
          const color = CATEGORY_COLORS[b.category] ?? { dot: "#a1a1aa" };
          const pct = ((Number(b.total) / total) * 100).toFixed(1);
          return (
            <div key={b.category} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color.dot }} />
              <span className="min-w-0 flex-1 truncate text-zinc-600">
                {CATEGORY_LABELS[b.category as ExpenseCategory] ?? b.category}
              </span>
              <span className="shrink-0 font-medium text-zinc-900">
                {formatMoney(b.total)} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [incomeChangePct, setIncomeChangePct] = useState<number | null>(null);
  const [expenseChangePct, setExpenseChangePct] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<ExpenseCategory>("MISHAHARA");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateInput());
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const resetForm = () => {
    setCategory("MISHAHARA");
    setAmount("");
    setDate(todayDateInput());
    setDescription("");
    setPaymentMethod("");
    setAttachmentFile(null);
    setFormError(null);
  };

  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    const [summaryRes, dashboardRes, breakdownRes, expensesRes] = await Promise.all([
      fetch(`/api/finance/summary?period=${p}`),
      fetch(`/api/dashboard/summary?period=${p}`),
      fetch(`/api/finance/category-breakdown?period=${p}`),
      fetch("/api/expenses?all=true"),
    ]);
    setSummary(await summaryRes.json());
    const dashJson = await dashboardRes.json();
    setIncomeChangePct(dashJson.incomeChangePct ?? null);
    setExpenseChangePct(dashJson.expenseChangePct ?? null);
    const breakdownJson = await breakdownRes.json();
    setBreakdown(breakdownJson.breakdown ?? []);
    const expensesJson = await expensesRes.json();
    setExpenses(expensesJson.expenses ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(period);
  }, [loadData, period]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, date, description, paymentMethod: paymentMethod || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Imeshindwa kuongeza expense.");
        return;
      }
      if (attachmentFile) {
        const fd = new FormData();
        fd.append("attachment", attachmentFile);
        await fetch(`/api/expenses/${json.expense.id}/attachment`, {
          method: "POST",
          body: fd,
        });
      }
      resetForm();
      await loadData(period);
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        CATEGORY_LABELS[e.category].toLowerCase().includes(q)
    );
  }, [expenses, search]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageItems = filteredExpenses.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Finance / Accounting</h1>
          <p className="text-sm text-zinc-500">Dhibiti mapato, matumizi na uhasibu wa taasisi</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="bg-transparent text-sm outline-none"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {summary && (
              <span className="text-xs text-zinc-400">
                ({formatDateRange(summary.from, summary.to)})
              </span>
            )}
          </div>
          <ListToolbar filename="expenses-report" columns={CSV_COLUMNS} rows={expenses} />
          <button
            type="button"
            onClick={() => document.getElementById("ongeza-expense-form")?.scrollIntoView({ behavior: "smooth" })}
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
          >
            <Receipt className="h-4 w-4" />
            Ongeza Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Mapato ya Mwezi"
          value={summary ? `TZS ${formatMoney(summary.income)}` : "..."}
          changePct={incomeChangePct}
        />
        <KpiCard
          icon={TrendingUp}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Matumizi ya Mwezi"
          value={summary ? `TZS ${formatMoney(summary.expenses)}` : "..."}
          changePct={expenseChangePct}
          invertColor
        />
        <KpiCard
          icon={PieChart}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          label="Net Profit"
          value={summary ? `TZS ${formatMoney(summary.netProfit)}` : "..."}
          changePct={expenseChangePct}
          invertColor
        />
        <KpiCard
          icon={FileText}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="Outstanding Invoices"
          value={summary ? String(summary.outstandingInvoices) : "..."}
          changePct={0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div id="ongeza-expense-form" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm print:hidden">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Ongeza Expense</h2>
              <p className="text-xs text-zinc-500">Ingiza matumizi mapya</p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-600"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Kiasi (TZS)</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15,000"
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Tarehe</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Payment Method (hiari)</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod | "")}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">-- chagua --</option>
                {PAYMENT_METHOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Maelezo</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Vehicle fuel"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-blue">
              <Paperclip className="h-3.5 w-3.5" />
              {attachmentFile ? attachmentFile.name : "+ Add Attachment (hiari)"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {formError && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-1 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Ongeza Expense"}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Matumizi kwa Category ({PERIOD_OPTIONS.find((p) => p.value === period)?.label})
          </h2>
          <CategoryDonut breakdown={breakdown} />
          <Link
            href="/reports"
            className="mt-4 flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
          >
            View full report
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Quick Actions</h2>
          <div className="flex flex-col gap-1">
            {[
              { icon: Receipt, label: "Ongeza Expense", onClick: () => document.getElementById("ongeza-expense-form")?.scrollIntoView({ behavior: "smooth" }) },
              { icon: FileText, label: "Ongeza Invoice", href: "/billing/new" },
              { icon: Wallet, label: "Pokea Malipo", href: "/billing" },
              { icon: BarChart3, label: "Financial Reports", href: "/reports" },
            ].map((action) =>
              action.href ? (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-blue-light text-brand-blue">
                    <action.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                </Link>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-blue-light text-brand-blue">
                    <action.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Malipo ya Hivi Karibuni</h2>
            <button
              type="button"
              onClick={() => document.getElementById("expenses-table")?.scrollIntoView({ behavior: "smooth" })}
              className="text-xs font-medium text-brand-blue hover:underline"
            >
              View All
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna matumizi bado.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {expenses.slice(0, 6).map((exp) => {
                const color = CATEGORY_COLORS[exp.category] ?? { bg: "bg-zinc-100", text: "text-zinc-600" };
                return (
                  <div key={exp.id} className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color.bg} ${color.text}`}>
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{exp.description}</p>
                      <p className="text-xs text-zinc-400">{CATEGORY_LABELS[exp.category]}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-red-600">-{formatMoney(exp.amount)}</p>
                      <p className="text-xs text-zinc-400">{exp.date.slice(0, 10)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div id="expenses-table" className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Matumizi ya Hivi Karibuni</h2>
            <div className="flex items-center gap-2 print:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search maelezo au category..."
                  className="w-56 rounded-lg border border-zinc-300 py-1.5 pr-2 pl-8 text-xs"
                />
              </div>
              <ListToolbar filename="expenses" columns={CSV_COLUMNS} rows={filteredExpenses} />
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : filteredExpenses.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna matumizi yanayolingana.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Tarehe</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Maelezo</th>
                      <th className="py-2 pr-3 text-right">Kiasi</th>
                      <th className="py-2 pr-3">Payment Method</th>
                      <th className="py-2 pr-3">Attachment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((exp, idx) => {
                      const color = CATEGORY_COLORS[exp.category] ?? { bg: "bg-zinc-100", text: "text-zinc-600" };
                      const pm = exp.payment_method ? PAYMENT_METHOD_COLORS[exp.payment_method] : null;
                      return (
                        <tr key={exp.id} className="border-b border-zinc-100 last:border-0">
                          <td className="py-2 pr-3 text-zinc-400">
                            {(pageClamped - 1) * pageSize + idx + 1}
                          </td>
                          <td className="py-2 pr-3 text-zinc-600">{exp.date.slice(0, 10)}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color.bg} ${color.text}`}>
                              {CATEGORY_LABELS[exp.category]}
                            </span>
                          </td>
                          <td className="py-2 pr-3">{exp.description}</td>
                          <td className="py-2 pr-3 text-right font-medium text-zinc-900">
                            {formatMoney(exp.amount)}
                          </td>
                          <td className="py-2 pr-3">
                            {exp.payment_method ? (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${pm?.bg} ${pm?.text}`}>
                                {PAYMENT_METHOD_LABELS[exp.payment_method]}
                              </span>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            {exp.attachment_url ? (
                              <a
                                href={exp.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-brand-blue hover:underline"
                              >
                                <Paperclip className="h-3.5 w-3.5" />1
                              </a>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 print:hidden">
                <span>
                  Showing {(pageClamped - 1) * pageSize + 1} to{" "}
                  {Math.min(pageClamped * pageSize, filteredExpenses.length)} of {filteredExpenses.length} entries
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pageClamped === 1}
                      className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      ←
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={`rounded px-2 py-1 font-medium ${
                          n === pageClamped ? "bg-brand-blue text-white" : "hover:bg-zinc-100"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={pageClamped === totalPages}
                      className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
