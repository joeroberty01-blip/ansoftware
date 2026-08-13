"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExpenseCategory } from "@/lib/types";

interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  description: string;
  created_at: string;
}

interface Summary {
  income: string;
  expenses: string;
  netProfit: string;
  outstandingInvoices: number;
}

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

function formatMoney(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function FinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<ExpenseCategory>("MISHAHARA");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateInput());
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [summaryRes, expensesRes] = await Promise.all([
      fetch("/api/finance/summary?period=month"),
      fetch("/api/expenses"),
    ]);
    const summaryJson = await summaryRes.json();
    const expensesJson = await expensesRes.json();
    setSummary(summaryJson);
    setExpenses(expensesJson.expenses ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amount, date, description }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Imeshindwa kuongeza expense.");
        return;
      }
      setAmount("");
      setDescription("");
      setDate(todayDateInput());
      await loadData();
    } catch {
      setFormError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-zinc-900">
        Finance / Accounting
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Mapato ya Mwezi"
          value={summary ? formatMoney(summary.income) : "..."}
        />
        <SummaryCard
          label="Matumizi ya Mwezi"
          value={summary ? formatMoney(summary.expenses) : "..."}
        />
        <SummaryCard
          label="Net Profit"
          value={summary ? formatMoney(summary.netProfit) : "..."}
        />
        <SummaryCard
          label="Outstanding Invoices"
          value={summary ? String(summary.outstandingInvoices) : "..."}
        />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">
          Ongeza Expense
        </h2>
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Category
            </label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as ExpenseCategory)
              }
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
            <label className="text-xs font-medium text-zinc-600">
              Kiasi (TZS)
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="mf. 15000"
              inputMode="decimal"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Tarehe
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 lg:col-span-2">
            <label className="text-xs font-medium text-zinc-600">
              Maelezo
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="mf. Mafuta ya gari"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {submitting ? "Inaongeza..." : "Ongeza Expense"}
            </button>
          </div>
        </form>
        {formError && (
          <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">
          Matumizi ya Hivi Karibuni
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna matumizi bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Maelezo</th>
                <th className="py-2 pr-4 text-right">Kiasi</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr
                  key={exp.id}
                  className="border-b border-zinc-100 last:border-0"
                >
                  <td className="py-2 pr-4">{exp.date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    {CATEGORY_LABELS[exp.category]}
                  </td>
                  <td className="py-2 pr-4">{exp.description}</td>
                  <td className="py-2 pr-4 text-right">
                    {formatMoney(exp.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
