"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";

interface Staff {
  id: string;
  staff_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  profession: string;
  license_number: string | null;
  license_expiry_date: string | null;
  start_date: string;
  employment_status: string;
  base_salary: string;
}

const PROFESSIONS = ["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF"];

const CSV_COLUMNS = [
  { key: "staff_number", label: "ID No" },
  { key: "full_name", label: "Jina" },
  { key: "email", label: "Barua Pepe" },
  { key: "phone", label: "Simu" },
  { key: "profession", label: "Taaluma" },
  { key: "start_date", label: "Tarehe ya Kuanza" },
  { key: "employment_status", label: "Status" },
  { key: "base_salary", label: "Mshahara wa Msingi" },
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

export default function StaffListPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [profession, setProfession] = useState("NURSE");
  const [baseSalary, setBaseSalary] = useState("");
  const [allowances, setAllowances] = useState("0");
  const [startDate, setStartDate] = useState(todayDateInput());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/staff");
    const json = await res.json();
    setStaffList(json.staff ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          profession,
          baseSalary,
          allowances,
          startDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuongeza staff.");
        return;
      }
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setBaseSalary("");
      setAllowances("0");
      setStartDate(todayDateInput());
      setShowAddForm(false);
      await load();
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Staff Management</h1>
        <div className="flex gap-2">
          <ListToolbar
            filename="staff"
            columns={CSV_COLUMNS}
            rows={staffList}
          />
          <Link
            href="/staff/pending"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 print:hidden"
          >
            Wanaosubiri Idhini
          </Link>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark print:hidden"
          >
            {showAddForm ? "Funga Fomu" : "Ongeza Staff Mpya"}
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 print:hidden"
        >
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jina kamili"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Barua pepe"
            type="email"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Namba ya simu"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password ya awali"
            type="password"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <select
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {PROFESSIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            value={baseSalary}
            onChange={(e) => setBaseSalary(e.target.value)}
            placeholder="Mshahara wa Msingi"
            inputMode="decimal"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            value={allowances}
            onChange={(e) => setAllowances(e.target.value)}
            placeholder="Allowances"
            inputMode="decimal"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 lg:col-span-4">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50 sm:col-span-2 lg:col-span-4"
          >
            {submitting ? "Inaongeza..." : "Ongeza Staff"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : staffList.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna staff bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Jina</th>
                <th className="py-2 pr-4">Taaluma</th>
                <th className="py-2 pr-4">Leseni (Inaisha)</th>
                <th className="py-2 pr-4">Kuanza</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Mshahara</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => router.push(`/staff/${s.id}`)}
                  className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4">
                    <Link
                      href={`/staff/${s.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-zinc-900 underline"
                    >
                      {s.full_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{s.profession}</td>
                  <td className="py-2 pr-4">
                    {s.license_number ?? "-"}
                    {s.license_expiry_date
                      ? ` (${s.license_expiry_date.slice(0, 10)})`
                      : ""}
                  </td>
                  <td className="py-2 pr-4">{s.start_date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">{s.employment_status}</td>
                  <td className="py-2 pr-4 text-right">{fmt(s.base_salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
