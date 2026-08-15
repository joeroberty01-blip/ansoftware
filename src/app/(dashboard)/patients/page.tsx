"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  UserPlus,
  X,
  AlertCircle,
} from "lucide-react";
import { ListToolbar } from "../_components/list-toolbar";
import { downloadCsv } from "@/lib/csv-export";
import { calculateAge, relativeDays } from "@/lib/date-utils";

const CSV_COLUMNS = [
  { key: "patient_number", label: "Patient ID" },
  { key: "full_name", label: "Jina" },
  { key: "age", label: "Umri" },
  { key: "gender", label: "Jinsia" },
  { key: "phone", label: "Simu" },
  { key: "blood_type", label: "Blood Type" },
  { key: "chronic_conditions", label: "Chronic Conditions" },
  { key: "assigned_staff_name", label: "Nurse Aliyepangiwa" },
  { key: "last_visit_date", label: "Ziara ya Mwisho" },
  { key: "status", label: "Status" },
];

interface Patient {
  id: string;
  patient_number: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  blood_type: string | null;
  chronic_conditions: string | null;
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
  last_visit_date: string | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

type PatientStatus = "ACTIVE" | "PENDING" | "INACTIVE";

const STATUS_META: Record<PatientStatus, { label: string; dot: string; text: string }> = {
  ACTIVE: { label: "Active", dot: "bg-green-500", text: "text-green-700" },
  PENDING: { label: "Pending", dot: "bg-orange-400", text: "text-orange-600" },
  INACTIVE: { label: "Inactive", dot: "bg-zinc-400", text: "text-zinc-500" },
};

function derivePatientStatus(p: Patient): PatientStatus {
  if (!p.assigned_staff_id || !p.last_visit_date) return "PENDING";
  const last = new Date(p.last_visit_date.slice(0, 10));
  const diffDays = Math.round((Date.now() - last.getTime()) / 86_400_000);
  return diffDays <= 60 ? "ACTIVE" : "INACTIVE";
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const AVATAR_PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-pink-100", text: "text-pink-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-teal-100", text: "text-teal-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];

function avatarColorFor(name: string) {
  return AVATAR_PALETTE[hashString(name) % AVATAR_PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const CONDITION_PALETTE = [
  { bg: "bg-red-100", text: "text-red-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-green-100", text: "text-green-700" },
  { bg: "bg-blue-100", text: "text-blue-700" },
];

function conditionColorFor(name: string) {
  return CONDITION_PALETTE[hashString(name) % CONDITION_PALETTE.length];
}

function parseConditions(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type SortKey =
  | "full_name"
  | "patient_number"
  | "age"
  | "gender"
  | "blood_type"
  | "assigned_staff_name"
  | "last_visit_date"
  | "status";

function SortHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 hover:text-zinc-700"
    >
      {label}
      <ArrowUpDown
        className={`h-3 w-3 ${active ? "text-brand-blue" : "text-zinc-300"} ${
          active && dir === "desc" ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PatientsListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PatientStatus>("ALL");
  const [nurseFilter, setNurseFilter] = useState<string>("ALL");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => setIsAdmin(json.user?.role === "ADMIN"))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/patients");
    const json = await res.json();
    setPatients(json.patients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/staff")
        .then((r) => r.json())
        .then((json: { staff?: { id: string; full_name: string }[] }) =>
          setStaffOptions((json.staff ?? []).map((s) => ({ id: s.id, full_name: s.full_name })))
        )
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, nurseFilter, pageSize]);

  const enriched = useMemo(
    () =>
      patients.map((p) => ({
        ...p,
        age: calculateAge(p.date_of_birth),
        status: derivePatientStatus(p),
      })),
    [patients]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((p) => {
      if (q) {
        const matches =
          p.full_name.toLowerCase().includes(q) ||
          (p.patient_number ?? "").toLowerCase().includes(q) ||
          (p.phone ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (nurseFilter === "UNASSIGNED" && p.assigned_staff_id) return false;
      if (
        nurseFilter !== "ALL" &&
        nurseFilter !== "UNASSIGNED" &&
        p.assigned_staff_id !== nurseFilter
      )
        return false;
      return true;
    });
  }, [enriched, search, statusFilter, nurseFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "full_name":
          cmp = a.full_name.localeCompare(b.full_name);
          break;
        case "patient_number":
          cmp = (a.patient_number ?? "").localeCompare(b.patient_number ?? "");
          break;
        case "age":
          cmp = (a.age ?? -1) - (b.age ?? -1);
          break;
        case "gender":
          cmp = (a.gender ?? "").localeCompare(b.gender ?? "");
          break;
        case "blood_type":
          cmp = (a.blood_type ?? "").localeCompare(b.blood_type ?? "");
          break;
        case "assigned_staff_name":
          cmp = (a.assigned_staff_name ?? "").localeCompare(b.assigned_staff_name ?? "");
          break;
        case "last_visit_date":
          cmp = (a.last_visit_date ?? "").localeCompare(b.last_visit_date ?? "");
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const pageItems = sorted.slice((pageClamped - 1) * pageSize, pageClamped * pageSize);

  const onSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageItems.forEach((p) => next.delete(p.id));
      } else {
        pageItems.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDelete = async (p: Patient) => {
    if (
      !window.confirm(
        `Futa mgonjwa "${p.full_name}" KABISA? Hii itafuta pia dawa, documents, na home visits zake zote.`
      )
    ) {
      return;
    }
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/patients/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "Imeshindwa kufuta.");
        return;
      }
      await load();
    } catch {
      alert("Network error.");
    } finally {
      setDeletingId(null);
      setOpenMenuId(null);
    }
  };

  const onBulkAssign = async () => {
    if (!assignStaffId || selected.size === 0) return;
    setAssigning(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/patients/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assignedStaffId: assignStaffId }),
          })
        )
      );
      setSelected(new Set());
      setShowAssignMenu(false);
      setAssignStaffId("");
      await load();
    } catch {
      alert("Network error.");
    } finally {
      setAssigning(false);
    }
  };

  const onExportSelected = () => {
    const rows = enriched.filter((p) => selected.has(p.id));
    downloadCsv("patients-selected", CSV_COLUMNS, rows);
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Patients</h1>
        <div className="flex gap-2">
          <ListToolbar filename="patients" columns={CSV_COLUMNS} rows={enriched} />
          {isAdmin && (
            <Link
              href="/patients/new"
              className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark print:hidden"
            >
              <UserPlus className="h-4 w-4" />
              Ongeza Mgonjwa Mpya
            </Link>
          )}
        </div>
      </div>

      {!isAdmin && (
        <p className="rounded-lg bg-brand-blue-light/40 px-3 py-2 text-sm text-brand-blue print:hidden">
          Unaona wagonjwa waliopangiwa kwako pekee.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, Patient ID, phone..."
            className="w-full rounded-lg border border-zinc-300 py-1.5 pr-3 pl-8 text-sm"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter !== "ALL" || nurseFilter !== "ALL"
                ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
              <div className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "ALL" | PatientStatus)}
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  >
                    <option value="ALL">Zote</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                {isAdmin && (
                  <div className="mt-3 flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-600">Nurse</label>
                    <select
                      value={nurseFilter}
                      onChange={(e) => setNurseFilter(e.target.value)}
                      className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                    >
                      <option value="ALL">Zote</option>
                      <option value="UNASSIGNED">Haijapangiwa</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(statusFilter !== "ALL" || nurseFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("ALL");
                      setNurseFilter("ALL");
                    }}
                    className="mt-3 text-xs font-medium text-brand-blue hover:underline"
                  >
                    Futa filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ml-auto">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-zinc-500">Loading...</p>
        ) : sorted.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">Hakuna wagonjwa wanaolingana.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {isAdmin && (
                    <th className="py-2 pl-5 pr-2 print:hidden">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        className="h-3.5 w-3.5 rounded border-zinc-300"
                      />
                    </th>
                  )}
                  <th className="py-2 pr-4 pl-2">
                    <SortHeader label="Patient" sortKey="full_name" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Patient ID" sortKey="patient_number" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Age" sortKey="age" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Gender" sortKey="gender" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Blood Type" sortKey="blood_type" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">Chronic Conditions</th>
                  <th className="py-2 pr-4">
                    <SortHeader
                      label="Assigned Nurse"
                      sortKey="assigned_staff_name"
                      activeKey={sortKey}
                      dir={sortDir}
                      onSort={onSort}
                    />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Last Visit" sortKey="last_visit_date" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  {isAdmin && <th className="py-2 pr-5 print:hidden" />}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => {
                  const avatar = avatarColorFor(p.full_name);
                  const conditions = parseConditions(p.chronic_conditions);
                  const status = STATUS_META[p.status];
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/patients/${p.id}`)}
                      className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                    >
                      {isAdmin && (
                        <td className="py-2.5 pr-2 pl-5 print:hidden" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="h-3.5 w-3.5 rounded border-zinc-300"
                          />
                        </td>
                      )}
                      <td className="py-2.5 pr-4 pl-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatar.bg} ${avatar.text}`}
                          >
                            {initialsFor(p.full_name)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/patients/${p.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate font-medium text-zinc-900 hover:underline"
                            >
                              {p.full_name}
                            </Link>
                            <span className="text-xs text-zinc-400">
                              {p.patient_number ?? "-"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-600">{p.patient_number ?? "-"}</td>
                      <td className="py-2.5 pr-4 text-zinc-600">
                        {p.age !== null ? `${p.age} yrs` : "-"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={
                            p.gender === "MALE"
                              ? "text-blue-600"
                              : p.gender === "FEMALE"
                                ? "text-pink-600"
                                : "text-zinc-500"
                          }
                        >
                          {p.gender ?? "-"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {p.blood_type ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                            {p.blood_type}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {conditions.length === 0 ? (
                          <span className="text-zinc-400">-</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {conditions.slice(0, 2).map((c) => {
                              const color = conditionColorFor(c);
                              return (
                                <span
                                  key={c}
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color.bg} ${color.text}`}
                                >
                                  {c}
                                </span>
                              );
                            })}
                            {conditions.length > 2 && (
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                                +{conditions.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {p.assigned_staff_name ? (
                          <span className="text-zinc-700">{p.assigned_staff_name}</span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="text-zinc-700">{p.last_visit_date?.slice(0, 10) ?? "-"}</div>
                        <div className="text-xs text-zinc-400">
                          {p.last_visit_date ? relativeDays(p.last_visit_date) : "Hajapata ziara"}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      {isAdmin && (
                        <td
                          className="relative py-2.5 pr-5 text-right print:hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setOpenMenuId((cur) => (cur === p.id ? null : p.id))}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {openMenuId === p.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-5 z-20 mt-1 w-36 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                                <Link
                                  href={`/patients/${p.id}`}
                                  className="block px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  Fungua
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => onDelete(p)}
                                  disabled={deletingId === p.id}
                                  className="block w-full px-3 py-1.5 text-left text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                  {deletingId === p.id ? "Deleting..." : "Futa"}
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3 print:hidden">
            <div className="flex items-center gap-3 text-sm">
              {isAdmin && selected.size > 0 ? (
                <>
                  <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                    <input type="checkbox" checked readOnly className="h-3.5 w-3.5 rounded border-zinc-300" />
                    {selected.size} selected
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowAssignMenu((v) => !v)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Assign Nurse
                    </button>
                    {showAssignMenu && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowAssignMenu(false)} />
                        <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                          <select
                            value={assignStaffId}
                            onChange={(e) => setAssignStaffId(e.target.value)}
                            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm"
                          >
                            <option value="">-- chagua nurse --</option>
                            {staffOptions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.full_name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={onBulkAssign}
                            disabled={!assignStaffId || assigning}
                            className="mt-2 w-full rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-blue-dark disabled:opacity-50"
                          >
                            {assigning ? "Assigning..." : "Panga"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onExportSelected}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="h-3.5 w-3.5" />
                    Ghairi
                  </button>
                </>
              ) : (
                <span className="text-zinc-500">
                  Showing {(pageClamped - 1) * pageSize + 1}-
                  {Math.min(pageClamped * pageSize, sorted.length)} of {sorted.length} patients
                </span>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageClamped === 1}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 ||
                      n === totalPages ||
                      Math.abs(n - pageClamped) <= 1
                  )
                  .reduce<number[]>((acc, n) => {
                    if (acc.length > 0 && n - acc[acc.length - 1] > 1) acc.push(-1);
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === -1 ? (
                      <span key={`gap-${i}`} className="px-1 text-xs text-zinc-400">
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n)}
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          n === pageClamped
                            ? "bg-brand-blue text-white"
                            : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        {n}
                      </button>
                    )
                  )}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageClamped === totalPages}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
