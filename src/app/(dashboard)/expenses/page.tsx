"use client";

import { useCallback, useEffect, useState } from "react";
import { ListToolbar } from "../_components/list-toolbar";

type ExpenseCategory = "MISHAHARA" | "VIFAA" | "USAFIRI" | "UENDESHAJI" | "MENGINEYO";

type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: string;
  date: string;
  description: string;
  status: ExpenseStatus;
}

interface Bill {
  id: string;
  name: string;
  category: string;
  amount: string;
  due_date: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  paid_at: string | null;
  notes: string | null;
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

const EXPENSE_CSV_COLUMNS = [
  { key: "date", label: "Tarehe" },
  { key: "category", label: "Category" },
  { key: "description", label: "Maelezo" },
  { key: "amount", label: "Kiasi" },
];

const BILL_CSV_COLUMNS = [
  { key: "due_date", label: "Tarehe ya Malipo" },
  { key: "name", label: "Jina" },
  { key: "category", label: "Category" },
  { key: "amount", label: "Kiasi" },
  { key: "status", label: "Status" },
];

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const [tab, setTab] = useState<"expenses" | "bills">("expenses");

  // --- Expenses ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("UENDESHAJI");
  const [expAmount, setExpAmount] = useState("");
  const [expDate, setExpDate] = useState(todayDateInput());
  const [expDescription, setExpDescription] = useState("");
  const [expError, setExpError] = useState<string | null>(null);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseBusyId, setExpenseBusyId] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    const res = await fetch("/api/expenses?all=true");
    const json = await res.json();
    setExpenses(json.expenses ?? []);
    setLoadingExpenses(false);
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const onAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    setAddingExpense(true);
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
        setExpError(json.error ?? "Imeshindwa kuongeza expense.");
        return;
      }
      setExpAmount("");
      setExpDescription("");
      await loadExpenses();
    } catch {
      setExpError("Network error.");
    } finally {
      setAddingExpense(false);
    }
  };

  const onDecideExpense = async (id: string, status: "APPROVED" | "REJECTED") => {
    setExpError(null);
    setExpenseBusyId(id);
    try {
      const res = await fetch(`/api/expenses/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setExpError(json.error ?? "Imeshindwa kusasisha ombi.");
        return;
      }
      await loadExpenses();
    } catch {
      setExpError("Network error.");
    } finally {
      setExpenseBusyId(null);
    }
  };

  // --- Company Bills ---
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [billName, setBillName] = useState("");
  const [billCategory, setBillCategory] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState(todayDateInput());
  const [billError, setBillError] = useState<string | null>(null);
  const [addingBill, setAddingBill] = useState(false);
  const [billBusyId, setBillBusyId] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editBillName, setEditBillName] = useState("");
  const [editBillCategory, setEditBillCategory] = useState("");
  const [editBillAmount, setEditBillAmount] = useState("");
  const [editBillDueDate, setEditBillDueDate] = useState("");
  const [savingBillEdit, setSavingBillEdit] = useState(false);

  const loadBills = useCallback(async () => {
    setLoadingBills(true);
    const res = await fetch("/api/bills");
    const json = await res.json();
    setBills(json.bills ?? []);
    setLoadingBills(false);
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const onAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setBillError(null);
    setAddingBill(true);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: billName,
          category: billCategory,
          amount: billAmount,
          dueDate: billDueDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBillError(json.error ?? "Imeshindwa kuongeza bill.");
        return;
      }
      setBillName("");
      setBillCategory("");
      setBillAmount("");
      await loadBills();
    } catch {
      setBillError("Network error.");
    } finally {
      setAddingBill(false);
    }
  };

  const onPayBill = async (id: string) => {
    if (
      !window.confirm(
        "Lipa bill hii sasa? Kiasi kitaongezwa kwenye Expenses moja kwa moja."
      )
    ) {
      return;
    }
    setBillError(null);
    setBillBusyId(id);
    try {
      const res = await fetch(`/api/bills/${id}/pay`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setBillError(json.error ?? "Imeshindwa kulipa bill.");
        return;
      }
      await Promise.all([loadBills(), loadExpenses()]);
    } catch {
      setBillError("Network error.");
    } finally {
      setBillBusyId(null);
    }
  };

  const startEditingBill = (b: Bill) => {
    setEditingBillId(b.id);
    setEditBillName(b.name);
    setEditBillCategory(b.category);
    setEditBillAmount(b.amount);
    setEditBillDueDate(b.due_date.slice(0, 10));
    setBillError(null);
  };

  const onSaveBillEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBillId) return;
    setBillError(null);
    setSavingBillEdit(true);
    try {
      const res = await fetch(`/api/bills/${editingBillId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editBillName,
          category: editBillCategory,
          amount: editBillAmount,
          dueDate: editBillDueDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setBillError(json.error ?? "Failed to save.");
        return;
      }
      setEditingBillId(null);
      await loadBills();
    } catch {
      setBillError("Network error.");
    } finally {
      setSavingBillEdit(false);
    }
  };

  const onDeleteBill = async (id: string) => {
    if (!window.confirm("Futa bill hii?")) return;
    setBillError(null);
    setBillBusyId(id);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setBillError(json.error ?? "Imeshindwa kufuta bill.");
        return;
      }
      await loadBills();
    } catch {
      setBillError("Network error.");
    } finally {
      setBillBusyId(null);
    }
  };

  const isOverdue = (b: Bill) =>
    b.status === "PENDING" && b.due_date.slice(0, 10) < todayDateInput();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Expenses</h1>
        <ListToolbar
          filename={tab === "expenses" ? "expenses" : "company-bills"}
          columns={tab === "expenses" ? EXPENSE_CSV_COLUMNS : BILL_CSV_COLUMNS}
          rows={tab === "expenses" ? expenses : bills}
        />
      </div>

      <div className="flex gap-2 border-b border-zinc-200 print:hidden">
        <button
          onClick={() => setTab("expenses")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "expenses"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Matumizi (Expenses)
        </button>
        <button
          onClick={() => setTab("bills")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "bills"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Bills za Kampuni
        </button>
      </div>

      {tab === "expenses" && (
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm print:hidden">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">
              Ongeza Expense
            </h2>
            <form
              onSubmit={onAddExpense}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="Kiasi"
                inputMode="decimal"
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
                placeholder="Maelezo"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={addingExpense}
                className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {addingExpense ? "Adding..." : "Ongeza Expense"}
              </button>
            </form>
            {expError && (
              <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {expError}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            {loadingExpenses ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : expenses.length === 0 ? (
              <p className="text-sm text-zinc-500">Hakuna matumizi bado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4">Tarehe</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Maelezo</th>
                    <th className="py-2 pr-4 text-right">Kiasi</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2 pr-4">{exp.date.slice(0, 10)}</td>
                      <td className="py-2 pr-4">{CATEGORY_LABELS[exp.category]}</td>
                      <td className="py-2 pr-4">{exp.description}</td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {fmt(exp.amount)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            exp.status === "APPROVED"
                              ? "font-medium text-green-700"
                              : exp.status === "REJECTED"
                              ? "font-medium text-red-700"
                              : "font-medium text-amber-700"
                          }
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right print:hidden">
                        {exp.status === "PENDING" && (
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => onDecideExpense(exp.id, "APPROVED")}
                              disabled={expenseBusyId === exp.id}
                              className="text-xs font-medium text-brand-blue underline disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => onDecideExpense(exp.id, "REJECTED")}
                              disabled={expenseBusyId === exp.id}
                              className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "bills" && (
        <>
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm print:hidden">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">
              Add Bill (e.g. Electricity, Water, Office Rent, Internet)
            </h2>
            <form
              onSubmit={onAddBill}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              <input
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                placeholder="Jina la Bill"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                value={billCategory}
                onChange={(e) => setBillCategory(e.target.value)}
                placeholder="Category (e.g. Umeme)"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="Kiasi"
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={addingBill}
                className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {addingBill ? "Adding..." : "Add Bill"}
              </button>
            </form>
            {billError && (
              <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {billError}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            {loadingBills ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : bills.length === 0 ? (
              <p className="text-sm text-zinc-500">Hakuna bills bado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4">Tarehe ya Malipo</th>
                    <th className="py-2 pr-4">Jina</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4 text-right">Kiasi</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) =>
                    editingBillId === b.id ? (
                      <tr key={b.id} className="border-b border-zinc-100 last:border-0 bg-brand-blue-light/30">
                        <td className="py-2 pr-4">
                          <input
                            type="date"
                            value={editBillDueDate}
                            onChange={(e) => setEditBillDueDate(e.target.value)}
                            className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            value={editBillName}
                            onChange={(e) => setEditBillName(e.target.value)}
                            className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            value={editBillCategory}
                            onChange={(e) => setEditBillCategory(e.target.value)}
                            className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            value={editBillAmount}
                            onChange={(e) => setEditBillAmount(e.target.value)}
                            inputMode="decimal"
                            className="w-full rounded border border-zinc-300 px-2 py-1 text-right text-sm"
                          />
                        </td>
                        <td className="py-2 pr-4 text-xs text-zinc-500">PENDING</td>
                        <td className="py-2 pr-4 text-right print:hidden">
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={onSaveBillEdit}
                              disabled={savingBillEdit}
                              className="text-xs font-medium text-brand-blue underline disabled:opacity-50"
                            >
                              Hifadhi
                            </button>
                            <button
                              onClick={() => setEditingBillId(null)}
                              className="text-xs font-medium text-zinc-600 underline"
                            >
                              Ghairi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                    <tr key={b.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2 pr-4">{b.due_date.slice(0, 10)}</td>
                      <td className="py-2 pr-4 font-medium">{b.name}</td>
                      <td className="py-2 pr-4">{b.category}</td>
                      <td className="py-2 pr-4 text-right">{fmt(b.amount)}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            b.status === "PAID"
                              ? "font-medium text-green-700"
                              : isOverdue(b)
                              ? "font-medium text-red-700"
                              : "font-medium text-amber-700"
                          }
                        >
                          {b.status === "PENDING" && isOverdue(b) ? "OVERDUE" : b.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right print:hidden">
                        {b.status === "PENDING" && (
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => onPayBill(b.id)}
                              disabled={billBusyId === b.id}
                              className="text-xs font-medium text-brand-blue underline disabled:opacity-50"
                            >
                              Lipa
                            </button>
                            <button
                              onClick={() => startEditingBill(b)}
                              disabled={billBusyId === b.id}
                              className="text-xs font-medium text-zinc-700 underline disabled:opacity-50"
                            >
                              Hariri
                            </button>
                            <button
                              onClick={() => onDeleteBill(b.id)}
                              disabled={billBusyId === b.id}
                              className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                            >
                              Futa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    )
                  )}
                </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
