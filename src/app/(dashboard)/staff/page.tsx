"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
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

interface PatientOption {
  id: string;
  full_name: string;
  assigned_staff_id: string | null;
}

const PROFESSIONS = ["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF"];

const CSV_COLUMNS = [
  { key: "staff_number", label: "ID No" },
  { key: "full_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "profession", label: "Profession" },
  { key: "start_date", label: "Start Date" },
  { key: "employment_status", label: "Status" },
  { key: "base_salary", label: "Base Salary" },
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

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [assignMenuStaffId, setAssignMenuStaffId] = useState<string | null>(null);
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);

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

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((json: { patients?: PatientOption[] }) => setPatients(json.patients ?? []))
      .catch(() => {});
  }, []);

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
        setError(json.error ?? "Failed to add staff.");
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
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignMenu = (staffId: string) => {
    setAssignMenuStaffId(staffId);
    setSelectedPatientIds(new Set());
  };

  const togglePatientSelection = (id: string) => {
    setSelectedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onAssignPatients = async () => {
    if (!assignMenuStaffId || selectedPatientIds.size === 0) return;
    setAssigning(true);
    try {
      await Promise.all(
        Array.from(selectedPatientIds).map((id) =>
          fetch(`/api/patients/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignedStaffId: assignMenuStaffId }),
          })
        )
      );
      setAssignMenuStaffId(null);
      setSelectedPatientIds(new Set());
      const res = await fetch("/api/patients");
      const json = await res.json();
      setPatients(json.patients ?? []);
    } catch {
      alert("Network error.");
    } finally {
      setAssigning(false);
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
            Pending Approvals
          </Link>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark print:hidden"
          >
            {showAddForm ? "Close Form" : "Add New Staff"}
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
            placeholder="Full name"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Initial password"
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
            placeholder="Base salary"
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
            {submitting ? "Adding..." : "Add Staff"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : staffList.length === 0 ? (
          <p className="text-sm text-zinc-500">No staff yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Profession</th>
                <th className="py-2 pr-4">License (Expires)</th>
                <th className="py-2 pr-4">Start Date</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Salary</th>
                <th className="py-2 pr-4 print:hidden" />
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
                  <td
                    className="relative py-2 pr-4 text-right print:hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openAssignMenu(s.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-brand-blue hover:text-brand-blue"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Assign Nurse
                    </button>
                    {assignMenuStaffId === s.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setAssignMenuStaffId(null)} />
                        <div className="absolute right-4 z-20 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-lg">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-zinc-700">
                              Assign patients to {s.full_name}
                            </p>
                            <button
                              type="button"
                              onClick={() => setAssignMenuStaffId(null)}
                              className="text-zinc-400 hover:text-zinc-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {patients.length === 0 ? (
                            <p className="text-xs text-zinc-500">No patients found.</p>
                          ) : (
                            <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                              {patients.map((p) => (
                                <label
                                  key={p.id}
                                  className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-zinc-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPatientIds.has(p.id)}
                                    onChange={() => togglePatientSelection(p.id)}
                                    className="h-3.5 w-3.5 rounded border-zinc-300"
                                  />
                                  <span className="flex-1 truncate">{p.full_name}</span>
                                  {p.assigned_staff_id === s.id && (
                                    <span className="text-[10px] text-green-600">current</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={onAssignPatients}
                            disabled={selectedPatientIds.size === 0 || assigning}
                            className="mt-3 w-full rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-blue-dark disabled:opacity-50"
                          >
                            {assigning ? "Assigning..." : `Assign (${selectedPatientIds.size})`}
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
