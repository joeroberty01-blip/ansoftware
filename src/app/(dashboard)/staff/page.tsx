"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserCheck,
  Briefcase,
  Wallet,
  Search,
  Filter,
  MoreVertical,
  RotateCcw,
  UserPlus,
  ClipboardList,
  X,
  ArrowUpDown,
} from "lucide-react";
import { ListToolbar } from "../_components/list-toolbar";
import { downloadCsv } from "@/lib/csv-export";
import { relativeDays } from "@/lib/date-utils";

interface Staff {
  id: string;
  staff_number: string;
  photo_url: string | null;
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

interface StaffOverview {
  statusCounts: { active: number; onLeave: number; inactive: number; terminated: number };
  growth: { totalNow: number; totalMonthAgo: number };
  departments: { department: string; count: number }[];
  payroll: { currentTotal: string; previousTotal: string };
}

const PROFESSIONS = ["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF"];

const DEPARTMENT_BY_PROFESSION: Record<string, string> = {
  NURSE: "Nursing",
  DOCTOR: "Medical",
  CHW: "Support",
  ADMIN_STAFF: "Admin",
};

const STATUS_META: Record<string, { label: string; dot: string; text: string }> = {
  ACTIVE: { label: "Active", dot: "bg-green-500", text: "text-green-700" },
  INACTIVE: { label: "Inactive", dot: "bg-zinc-400", text: "text-zinc-500" },
  TERMINATED: { label: "Terminated", dot: "bg-red-500", text: "text-red-700" },
};

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

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  changePct,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  changePct?: number | null;
}) {
  const isUp = (changePct ?? 0) > 0;
  const isFlat = !changePct;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-zinc-900">{value}</p>
        {changePct !== undefined && (
          <p className={`mt-0.5 text-xs ${isFlat ? "text-zinc-400" : isUp ? "text-green-600" : "text-red-600"}`}>
            {changePct === null ? "-" : isFlat ? "↔" : isUp ? "↑" : "↓"}{" "}
            {changePct === null ? "" : `${Math.abs(changePct)}%`} from last month
          </p>
        )}
      </div>
    </div>
  );
}

function StaffDonut({ counts }: { counts: StaffOverview["statusCounts"] }) {
  const total = counts.active + counts.onLeave + counts.inactive + counts.terminated;
  const segments = [
    { label: "Active", value: counts.active, color: "#16a34a" },
    { label: "On Leave", value: counts.onLeave, color: "#f59e0b" },
    { label: "Inactive", value: counts.inactive, color: "#a1a1aa" },
    { label: "Terminated", value: counts.terminated, color: "#dc2626" },
  ].filter((s) => s.value > 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">No staff yet.</p>;
  }

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f4f4f5" strokeWidth="14" />
          {segments.map((seg) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
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
          <span className="text-lg font-bold text-zinc-900">{total}</span>
          <span className="text-[10px] text-zinc-500">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-zinc-600">{seg.label}</span>
            <span className="font-medium text-zinc-900">
              {seg.value} ({((seg.value / total) * 100).toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartmentBarChart({ departments }: { departments: StaffOverview["departments"] }) {
  const max = Math.max(...departments.map((d) => d.count), 1);
  if (departments.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-500">No staff yet.</p>;
  }
  return (
    <div className="flex h-40 items-end gap-3">
      {departments.map((d) => (
        <div key={d.department} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold text-zinc-700">{d.count}</span>
          <div
            className="w-full rounded-t bg-brand-blue"
            style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
            title={`${d.department}: ${d.count}`}
          />
          <span className="text-[10px] text-zinc-500">{d.department}</span>
        </div>
      ))}
    </div>
  );
}

type SortKey = "full_name" | "profession" | "start_date" | "employment_status" | "base_salary";

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
    <button type="button" onClick={() => onSort(sortKey)} className="flex items-center gap-1 hover:text-zinc-700">
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "text-brand-blue" : "text-zinc-300"} ${active && dir === "desc" ? "rotate-180" : ""}`} />
    </button>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function StaffListPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [overview, setOverview] = useState<StaffOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [dutyMenuStaffId, setDutyMenuStaffId] = useState<string | null>(null);
  const [dutyTitle, setDutyTitle] = useState("");
  const [dutyDueDate, setDutyDueDate] = useState("");
  const [assigningDuty, setAssigningDuty] = useState(false);
  const [dutyError, setDutyError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
    fetch("/api/staff/overview")
      .then((r) => r.json())
      .then((json) => setOverview(json))
      .catch(() => {});
  }, [staffList]);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((json: { patients?: PatientOption[] }) => setPatients(json.patients ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, deptFilter, statusFilter, pageSize]);

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
    setOpenMenuId(null);
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

  const openDutyMenu = (staffId: string) => {
    setDutyMenuStaffId(staffId);
    setDutyTitle("");
    setDutyDueDate(todayDateInput());
    setDutyError(null);
    setOpenMenuId(null);
  };

  const onAssignDuty = async (staffId: string) => {
    if (!dutyTitle.trim()) {
      setDutyError("Task title is required.");
      return;
    }
    setAssigningDuty(true);
    setDutyError(null);
    try {
      const res = await fetch(`/api/staff/${staffId}/duties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: dutyTitle, dueDate: dutyDueDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDutyError(json.error ?? "Failed to assign task.");
        return;
      }
      setDutyMenuStaffId(null);
    } catch {
      setDutyError("Network error.");
    } finally {
      setAssigningDuty(false);
    }
  };

  const enriched = useMemo(
    () =>
      staffList.map((s) => ({
        ...s,
        department: DEPARTMENT_BY_PROFESSION[s.profession] ?? s.profession,
      })),
    [staffList]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((s) => {
      if (q) {
        const matches =
          s.full_name.toLowerCase().includes(q) ||
          s.staff_number.toLowerCase().includes(q) ||
          s.profession.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (roleFilter !== "ALL" && s.profession !== roleFilter) return false;
      if (deptFilter !== "ALL" && s.department !== deptFilter) return false;
      if (statusFilter !== "ALL" && s.employment_status !== statusFilter) return false;
      return true;
    });
  }, [enriched, search, roleFilter, deptFilter, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "full_name":
          cmp = a.full_name.localeCompare(b.full_name);
          break;
        case "profession":
          cmp = a.profession.localeCompare(b.profession);
          break;
        case "start_date":
          cmp = a.start_date.localeCompare(b.start_date);
          break;
        case "employment_status":
          cmp = a.employment_status.localeCompare(b.employment_status);
          break;
        case "base_salary":
          cmp = Number(a.base_salary) - Number(b.base_salary);
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

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((s) => selected.has(s.id));
  const toggleSelectAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach((s) => next.delete(s.id));
      else pageItems.forEach((s) => next.add(s.id));
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

  const departmentOptions = Array.from(new Set(Object.values(DEPARTMENT_BY_PROFESSION)));

  const onExportSelected = () => {
    const rows = enriched.filter((s) => selected.has(s.id));
    downloadCsv("staff-selected", CSV_COLUMNS, rows);
  };

  const totalStaffPct = overview ? pctChange(overview.growth.totalNow, overview.growth.totalMonthAgo) : null;
  const payrollPct = overview
    ? pctChange(Number(overview.payroll.currentTotal), Number(overview.payroll.previousTotal))
    : null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Staff Management</h1>
          <p className="text-sm text-zinc-500">Manage your healthcare team, schedules and payroll</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
          >
            <UserPlus className="h-4 w-4" />
            {showAddForm ? "Close Form" : "Add Staff"}
          </button>
          <ListToolbar filename="staff" columns={CSV_COLUMNS} rows={staffList} />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              More
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  <Link
                    href="/staff/pending"
                    className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                    onClick={() => setShowMoreMenu(false)}
                  >
                    Pending Approvals
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          label="Total Staff"
          value={overview ? String(overview.growth.totalNow) : "..."}
          changePct={totalStaffPct}
        />
        <KpiCard
          icon={UserCheck}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          label="Active Staff"
          value={overview ? String(overview.statusCounts.active) : "..."}
        />
        <KpiCard
          icon={Briefcase}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
          label="On Leave"
          value={overview ? String(overview.statusCounts.onLeave) : "..."}
        />
        <KpiCard
          icon={Wallet}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          label="Monthly Payroll"
          value={overview ? `TZS ${fmt(overview.payroll.currentTotal)}` : "..."}
          changePct={payrollPct}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Staff Overview</h2>
          {overview ? <StaffDonut counts={overview.statusCounts} /> : <p className="text-sm text-zinc-500">Loading...</p>}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Staff by Department</h2>
          {overview ? (
            <DepartmentBarChart departments={overview.departments} />
          ) : (
            <p className="text-sm text-zinc-500">Loading...</p>
          )}
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 print:hidden"
        >
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Initial password" type="password" className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          <select value={profession} onChange={(e) => setProfession(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
            {PROFESSIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="Base salary" inputMode="decimal" className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          <input value={allowances} onChange={(e) => setAllowances(e.target.value)} placeholder="Allowances" inputMode="decimal" className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm" />
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2 lg:col-span-4">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50 sm:col-span-2 lg:col-span-4"
          >
            {submitting ? "Adding..." : "Add Staff"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff by name, ID, role..."
            className="w-full rounded-lg border border-zinc-300 py-1.5 pr-3 pl-8 text-sm"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              roleFilter !== "ALL" || deptFilter !== "ALL" || statusFilter !== "ALL"
                ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>
          {showFilterMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />
              <div className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Role</label>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                    <option value="ALL">All Roles</option>
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Department</label>
                  <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                    <option value="ALL">All Departments</option>
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-zinc-300 px-2 py-1.5 text-sm">
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
                {(roleFilter !== "ALL" || deptFilter !== "ALL" || statusFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoleFilter("ALL");
                      setDeptFilter("ALL");
                      setStatusFilter("ALL");
                    }}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear Filters
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <div className="ml-auto">
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-5 text-sm text-zinc-500">Loading...</p>
        ) : sorted.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No staff found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-2 pl-5">
                    <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAllOnPage} className="h-3.5 w-3.5 rounded border-zinc-300" />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Staff Member" sortKey="full_name" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Role" sortKey="profession" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Join Date" sortKey="start_date" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4">
                    <SortHeader label="Status" sortKey="employment_status" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-4 text-right">
                    <SortHeader label="Salary" sortKey="base_salary" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                  </th>
                  <th className="py-2 pr-5" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((s) => {
                  const status = STATUS_META[s.employment_status] ?? {
                    label: s.employment_status,
                    dot: "bg-zinc-400",
                    text: "text-zinc-500",
                  };
                  return (
                    <tr
                      key={s.id}
                      onClick={() => router.push(`/staff/${s.id}`)}
                      className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                    >
                      <td className="py-2.5 pr-2 pl-5" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} className="h-3.5 w-3.5 rounded border-zinc-300" />
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2.5">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt={s.full_name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-xs font-semibold text-brand-blue">
                              {s.full_name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <Link href={`/staff/${s.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-zinc-900 hover:underline">
                              {s.full_name}
                            </Link>
                            <span className="text-xs text-zinc-400">ID: {s.staff_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-zinc-600">{s.profession}</td>
                      <td className="py-2.5 pr-4 text-zinc-600">{DEPARTMENT_BY_PROFESSION[s.profession] ?? "-"}</td>
                      <td className="py-2.5 pr-4 text-zinc-600">{s.phone ?? "-"}</td>
                      <td className="py-2.5 pr-4">
                        <div className="text-zinc-700">{s.start_date.slice(0, 10)}</div>
                        <div className="text-xs text-zinc-400">{relativeDays(s.start_date)}</div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${status.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium text-zinc-900">{fmt(s.base_salary)}</td>
                      <td className="relative py-2.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((cur) => (cur === s.id ? null : s.id))}
                          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuId === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-5 z-20 mt-1 w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                              <Link href={`/staff/${s.id}`} className="block px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
                                View Profile
                              </Link>
                              <button
                                type="button"
                                onClick={() => openAssignMenu(s.id)}
                                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                Assign Patient
                              </button>
                              <button
                                type="button"
                                onClick={() => openDutyMenu(s.id)}
                                className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                              >
                                <ClipboardList className="h-3.5 w-3.5" />
                                Assign Duty
                              </button>
                            </div>
                          </>
                        )}
                        {assignMenuStaffId === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setAssignMenuStaffId(null)} />
                            <div className="absolute right-5 z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-lg">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold text-zinc-700">Assign patients to {s.full_name}</p>
                                <button type="button" onClick={() => setAssignMenuStaffId(null)} className="text-zinc-400 hover:text-zinc-600">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              {patients.length === 0 ? (
                                <p className="text-xs text-zinc-500">No patients found.</p>
                              ) : (
                                <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                                  {patients.map((p) => (
                                    <label key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-zinc-50">
                                      <input
                                        type="checkbox"
                                        checked={selectedPatientIds.has(p.id)}
                                        onChange={() => togglePatientSelection(p.id)}
                                        className="h-3.5 w-3.5 rounded border-zinc-300"
                                      />
                                      <span className="flex-1 truncate">{p.full_name}</span>
                                      {p.assigned_staff_id === s.id && <span className="text-[10px] text-green-600">current</span>}
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
                        {dutyMenuStaffId === s.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setDutyMenuStaffId(null)} />
                            <div className="absolute right-5 z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-lg">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold text-zinc-700">Assign duty to {s.full_name}</p>
                                <button type="button" onClick={() => setDutyMenuStaffId(null)} className="text-zinc-400 hover:text-zinc-600">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="flex flex-col gap-2">
                                <input
                                  value={dutyTitle}
                                  onChange={(e) => setDutyTitle(e.target.value)}
                                  placeholder="Task title"
                                  className="rounded border border-zinc-300 px-2 py-1.5 text-xs"
                                />
                                <input
                                  type="date"
                                  value={dutyDueDate}
                                  onChange={(e) => setDutyDueDate(e.target.value)}
                                  className="rounded border border-zinc-300 px-2 py-1.5 text-xs"
                                />
                              </div>
                              {dutyError && (
                                <p className="mt-2 text-xs text-red-600">{dutyError}</p>
                              )}
                              <button
                                type="button"
                                onClick={() => onAssignDuty(s.id)}
                                disabled={assigningDuty}
                                className="mt-3 w-full rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-blue-dark disabled:opacity-50"
                              >
                                {assigningDuty ? "Assigning..." : "Assign Duty"}
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-5 py-3 print:hidden">
            {selected.size > 0 ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                  <input type="checkbox" checked readOnly className="h-3.5 w-3.5 rounded border-zinc-300" />
                  {selected.size} selected
                </span>
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
                  Clear
                </button>
              </div>
            ) : (
              <span className="text-sm text-zinc-500">
                Showing {(pageClamped - 1) * pageSize + 1} to {Math.min(pageClamped * pageSize, sorted.length)} of {sorted.length} results
              </span>
            )}
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`rounded px-2 py-1 text-xs font-medium ${n === pageClamped ? "bg-brand-blue text-white" : "text-zinc-600 hover:bg-zinc-100"}`}
                  >
                    {n}
                  </button>
                ))}
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
