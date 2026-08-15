"use client";

import { useCallback, useEffect, useState } from "react";

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
  allowances: string;
  leave_balance_days: number;
  user_status: string;
}

interface Payroll {
  id: string;
  month: number;
  year: number;
  base_salary: string;
  allowances: string;
  nssf_deduction: string;
  paye_deduction: string;
  other_deductions: string;
  gross_pay: string;
  net_pay: string;
  status: string;
}

interface LeaveRequest {
  id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: string;
  decision_note: string | null;
}

interface Duty {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
}

const DUTY_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const PROFESSIONS = ["NURSE", "DOCTOR", "CHW", "ADMIN_STAFF"];
const EMPLOYMENT_STATUSES = ["ACTIVE", "INACTIVE", "TERMINATED"];

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

const MONTH_NAMES = [
  "Januari", "Februari", "Machi", "Aprili", "Mei", "Juni",
  "Julai", "Agosti", "Septemba", "Oktoba", "Novemba", "Desemba",
];

export function StaffDetailView({
  initialStaff,
  viewerIsAdmin,
  isOwnProfile,
}: {
  initialStaff: Staff;
  viewerIsAdmin: boolean;
  isOwnProfile: boolean;
}) {
  const [staff, setStaff] = useState<Staff>(initialStaff);
  const [tab, setTab] = useState<"payroll" | "leave" | "duties" | "performance">(
    "payroll"
  );

  // --- Edit profile (Admin only) ---
  const [editing, setEditing] = useState(false);
  const [profession, setProfession] = useState(staff.profession);
  const [licenseNumber, setLicenseNumber] = useState(staff.license_number ?? "");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(
    staff.license_expiry_date?.slice(0, 10) ?? ""
  );
  const [employmentStatus, setEmploymentStatus] = useState(staff.employment_status);
  const [baseSalary, setBaseSalary] = useState(staff.base_salary);
  const [allowances, setAllowances] = useState(staff.allowances);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profession,
          licenseNumber,
          licenseExpiryDate,
          employmentStatus,
          baseSalary,
          allowances,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setStaff((prev) => ({
        ...prev,
        profession: json.staff.profession,
        license_number: json.staff.license_number,
        license_expiry_date: json.staff.license_expiry_date,
        employment_status: json.staff.employment_status,
        base_salary: json.staff.base_salary,
        allowances: json.staff.allowances,
      }));
      setEditing(false);
    } catch {
      setEditError("Hitilafu ya mtandao.");
    } finally {
      setSaving(false);
    }
  };

  // --- Deactivate (Admin only, not own profile) ---
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const onDeactivate = async () => {
    if (
      !window.confirm(
        `Ondoa ${staff.full_name} kwenye timu? Ataondolewa kwenye orodha ya active staff na hataweza kuingia tena. Historia yake ya payroll haitafutwa.`
      )
    ) {
      return;
    }
    setDeactivateError(null);
    setDeactivating(true);
    try {
      const res = await fetch(`/api/staff/${staff.id}/deactivate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setDeactivateError(json.error ?? "Imeshindwa kuondoa staff.");
        return;
      }
      setStaff((prev) => ({
        ...prev,
        employment_status: json.staff.employment_status,
      }));
    } catch {
      setDeactivateError("Hitilafu ya mtandao.");
    } finally {
      setDeactivating(false);
    }
  };

  // --- Photo upload (Admin only) ---
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/staff/${staff.id}/photo`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setPhotoError(json.error ?? "Imeshindwa kupakia picha.");
        return;
      }
      setStaff((prev) => ({ ...prev, photo_url: json.staff.photo_url }));
    } catch {
      setPhotoError("Hitilafu ya mtandao.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // --- Payroll ---
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(true);
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const onPaySalary = async (payrollId: string) => {
    if (
      !window.confirm(
        "Lipa mshahara huu sasa? Kiasi kitaongezwa kwenye Expenses moja kwa moja."
      )
    ) {
      return;
    }
    setPayrollError(null);
    setPayingId(payrollId);
    try {
      const res = await fetch(`/api/payroll/${payrollId}/pay`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setPayrollError(json.error ?? "Imeshindwa kulipa mshahara.");
        return;
      }
      await loadPayrolls();
    } catch {
      setPayrollError("Hitilafu ya mtandao.");
    } finally {
      setPayingId(null);
    }
  };

  const loadPayrolls = useCallback(async () => {
    setLoadingPayroll(true);
    const res = await fetch(`/api/payroll?staffId=${staff.id}`);
    const json = await res.json();
    setPayrolls(json.payrolls ?? []);
    setLoadingPayroll(false);
  }, [staff.id]);

  useEffect(() => {
    loadPayrolls();
  }, [loadPayrolls]);

  const onGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayrollError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staff.id,
          month: payMonth,
          year: payYear,
          otherDeductions,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPayrollError(json.error ?? "Imeshindwa kutengeneza payroll.");
        return;
      }
      setOtherDeductions("0");
      await loadPayrolls();
    } catch {
      setPayrollError("Hitilafu ya mtandao.");
    } finally {
      setGenerating(false);
    }
  };

  // --- Leave ---
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loadingLeave, setLoadingLeave] = useState(true);
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const loadLeaves = useCallback(async () => {
    setLoadingLeave(true);
    const res = await fetch(`/api/leave-requests?staffId=${staff.id}`);
    const json = await res.json();
    setLeaves(json.leaveRequests ?? []);
    setLoadingLeave(false);
  }, [staff.id]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const onRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError(null);
    setRequesting(true);
    try {
      const res = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLeaveError(json.error ?? "Imeshindwa kuomba likizo.");
        return;
      }
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      await loadLeaves();
    } catch {
      setLeaveError("Hitilafu ya mtandao.");
    } finally {
      setRequesting(false);
    }
  };

  const onDecide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setLeaveError(null);
    setDecidingId(id);
    try {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLeaveError(json.error ?? "Imeshindwa kuamua.");
        return;
      }
      await loadLeaves();
      const staffRes = await fetch(
        viewerIsAdmin ? `/api/staff/${staff.id}` : `/api/staff/me`
      );
      const staffJson = await staffRes.json();
      if (staffJson.staff) {
        setStaff((prev) => ({
          ...prev,
          leave_balance_days: staffJson.staff.leave_balance_days,
        }));
      }
    } catch {
      setLeaveError("Hitilafu ya mtandao.");
    } finally {
      setDecidingId(null);
    }
  };

  // --- Duties ---
  const [duties, setDuties] = useState<Duty[]>([]);
  const [loadingDuties, setLoadingDuties] = useState(true);
  const [dutyTitle, setDutyTitle] = useState("");
  const [dutyDescription, setDutyDescription] = useState("");
  const [dutyDueDate, setDutyDueDate] = useState("");
  const [dutyError, setDutyError] = useState<string | null>(null);
  const [addingDuty, setAddingDuty] = useState(false);
  const [dutyBusyId, setDutyBusyId] = useState<string | null>(null);

  const dutiesBaseUrl = viewerIsAdmin
    ? `/api/staff/${staff.id}/duties`
    : `/api/staff/me/duties`;

  const loadDuties = useCallback(async () => {
    setLoadingDuties(true);
    const res = await fetch(dutiesBaseUrl);
    const json = await res.json();
    setDuties(json.duties ?? []);
    setLoadingDuties(false);
  }, [dutiesBaseUrl]);

  useEffect(() => {
    loadDuties();
  }, [loadDuties]);

  const onAddDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    setDutyError(null);
    setAddingDuty(true);
    try {
      const res = await fetch(dutiesBaseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dutyTitle,
          description: dutyDescription || undefined,
          dueDate: dutyDueDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDutyError(json.error ?? "Imeshindwa kuongeza jukumu.");
        return;
      }
      setDutyTitle("");
      setDutyDescription("");
      setDutyDueDate("");
      await loadDuties();
    } catch {
      setDutyError("Hitilafu ya mtandao.");
    } finally {
      setAddingDuty(false);
    }
  };

  const onDutyStatusChange = async (dutyId: string, status: string) => {
    setDutyError(null);
    setDutyBusyId(dutyId);
    try {
      const res = await fetch(`${dutiesBaseUrl}/${dutyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDutyError(json.error ?? "Imeshindwa kubadili status.");
        return;
      }
      await loadDuties();
    } catch {
      setDutyError("Hitilafu ya mtandao.");
    } finally {
      setDutyBusyId(null);
    }
  };

  const onDeleteDuty = async (dutyId: string) => {
    if (!window.confirm("Futa jukumu hili?")) return;
    setDutyError(null);
    setDutyBusyId(dutyId);
    try {
      const res = await fetch(`${dutiesBaseUrl}/${dutyId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        setDutyError(json.error ?? "Imeshindwa kufuta jukumu.");
        return;
      }
      await loadDuties();
    } catch {
      setDutyError("Hitilafu ya mtandao.");
    } finally {
      setDutyBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {staff.photo_url ? (
            <img
              src={staff.photo_url}
              alt={staff.full_name}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-200 text-xs text-zinc-500">
              Hakuna Picha
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {staff.full_name}
            </h1>
            <p className="text-sm text-zinc-600">
              {staff.profession} — {staff.email}
            </p>
            <p className="text-xs text-zinc-500">ID: {staff.staff_number}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2">
            {viewerIsAdmin && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                Hariri
              </button>
            )}
            {(viewerIsAdmin || isOwnProfile) && (
              <a
                href={`/api/staff/${staff.id}/id-card`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                Pakua ID Card (PDF)
              </a>
            )}
            {viewerIsAdmin && !isOwnProfile && staff.employment_status !== "TERMINATED" && (
              <button
                onClick={onDeactivate}
                disabled={deactivating}
                className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {deactivating ? "Inaondoa..." : "Ondoa Staff"}
              </button>
            )}
          </div>
          {deactivateError && (
            <p className="text-xs text-red-600">{deactivateError}</p>
          )}
          {viewerIsAdmin && (
            <label className="cursor-pointer text-xs font-medium text-brand-blue underline">
              {uploadingPhoto ? "Inapakia picha..." : "Pakia/Badilisha Picha"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPhotoSelected}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
      {photoError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {photoError}
        </p>
      )}

      {editing ? (
        <form
          onSubmit={onSaveEdit}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Taaluma</label>
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
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Employment Status</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {EMPLOYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Namba ya Leseni</label>
              <input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Leseni Inaisha</label>
              <input
                type="date"
                value={licenseExpiryDate}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Mshahara wa Msingi</label>
              <input
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Allowances</label>
              <input
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {editError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? "Inahifadhi..." : "Hifadhi"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Ghairi
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Simu</p>
              <p className="font-medium">{staff.phone ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Tarehe ya Kuanza</p>
              <p className="font-medium">{staff.start_date.slice(0, 10)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Employment Status</p>
              <p className="font-medium">{staff.employment_status}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Leseni</p>
              <p className="font-medium">{staff.license_number ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Leseni Inaisha</p>
              <p className="font-medium">
                {staff.license_expiry_date?.slice(0, 10) ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Mshahara wa Msingi</p>
              <p className="font-medium">{fmt(staff.base_salary)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Allowances</p>
              <p className="font-medium">{fmt(staff.allowances)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Leave Balance</p>
              <p className="font-medium">{staff.leave_balance_days} siku</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setTab("payroll")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "payroll"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Payroll History
        </button>
        <button
          onClick={() => setTab("leave")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "leave"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Leave Requests
        </button>
        <button
          onClick={() => setTab("duties")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "duties"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Duties
        </button>
        <button
          onClick={() => setTab("performance")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "performance"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Performance
        </button>
      </div>

      {tab === "payroll" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {viewerIsAdmin && (
            <form
              onSubmit={onGeneratePayroll}
              className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <select
                value={payMonth}
                onChange={(e) => setPayMonth(Number(e.target.value))}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={payYear}
                onChange={(e) => setPayYear(Number(e.target.value))}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(e.target.value)}
                placeholder="Other Deductions"
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={generating}
                className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {generating ? "Inatengeneza..." : "Tengeneza Payroll"}
              </button>
            </form>
          )}
          {payrollError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {payrollError}
            </p>
          )}
          {loadingPayroll ? (
            <p className="text-sm text-zinc-500">Inapakia...</p>
          ) : payrolls.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna payroll bado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Mwezi</th>
                  <th className="py-2 pr-4 text-right">Gross</th>
                  <th className="py-2 pr-4 text-right">NSSF</th>
                  <th className="py-2 pr-4 text-right">PAYE</th>
                  <th className="py-2 pr-4 text-right">Net Pay</th>
                  <th className="py-2 pr-4">Status</th>
                  {viewerIsAdmin && <th className="py-2 pr-4"></th>}
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </td>
                    <td className="py-2 pr-4 text-right">{fmt(p.gross_pay)}</td>
                    <td className="py-2 pr-4 text-right">{fmt(p.nssf_deduction)}</td>
                    <td className="py-2 pr-4 text-right">{fmt(p.paye_deduction)}</td>
                    <td className="py-2 pr-4 text-right font-medium">
                      {fmt(p.net_pay)}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={
                          p.status === "PAID"
                            ? "font-medium text-green-700"
                            : "font-medium text-amber-700"
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    {viewerIsAdmin && (
                      <td className="py-2 pr-4 text-right">
                        {p.status === "PENDING" && (
                          <button
                            onClick={() => onPaySalary(p.id)}
                            disabled={payingId === p.id}
                            className="rounded bg-brand-blue px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
                          >
                            {payingId === p.id ? "Inalipa..." : "Lipa Mshahara"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "leave" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {isOwnProfile && (
            <form
              onSubmit={onRequestLeave}
              className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4"
            >
              <input
                type="date"
                value={leaveStart}
                onChange={(e) => setLeaveStart(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={leaveEnd}
                onChange={(e) => setLeaveEnd(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Sababu"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-1"
              />
              <button
                type="submit"
                disabled={requesting}
                className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {requesting ? "Inaomba..." : "Omba Likizo"}
              </button>
            </form>
          )}
          {leaveError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {leaveError}
            </p>
          )}
          {loadingLeave ? (
            <p className="text-sm text-zinc-500">Inapakia...</p>
          ) : leaves.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna maombi ya likizo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Tarehe</th>
                  <th className="py-2 pr-4 text-right">Siku</th>
                  <th className="py-2 pr-4">Sababu</th>
                  <th className="py-2 pr-4">Status</th>
                  {viewerIsAdmin && <th className="py-2 pr-4"></th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4">
                      {l.start_date.slice(0, 10)} — {l.end_date.slice(0, 10)}
                    </td>
                    <td className="py-2 pr-4 text-right">{l.days}</td>
                    <td className="py-2 pr-4">{l.reason}</td>
                    <td className="py-2 pr-4">{l.status}</td>
                    {viewerIsAdmin && (
                      <td className="py-2 pr-4">
                        {l.status === "PENDING" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => onDecide(l.id, "APPROVED")}
                              disabled={decidingId === l.id}
                              className="text-xs font-medium text-green-700 underline disabled:opacity-50"
                            >
                              Idhinisha
                            </button>
                            <button
                              onClick={() => onDecide(l.id, "REJECTED")}
                              disabled={decidingId === l.id}
                              className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                            >
                              Kataa
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "duties" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {viewerIsAdmin && (
            <form
              onSubmit={onAddDuty}
              className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <input
                value={dutyTitle}
                onChange={(e) => setDutyTitle(e.target.value)}
                placeholder="Kichwa cha Jukumu"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                value={dutyDescription}
                onChange={(e) => setDutyDescription(e.target.value)}
                placeholder="Maelezo (hiari)"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={dutyDueDate}
                onChange={(e) => setDutyDueDate(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={addingDuty}
                className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {addingDuty ? "Inaongeza..." : "Panga Jukumu"}
              </button>
            </form>
          )}
          {dutyError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {dutyError}
            </p>
          )}
          {loadingDuties ? (
            <p className="text-sm text-zinc-500">Inapakia...</p>
          ) : duties.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna majukumu yaliyopangwa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Jukumu</th>
                  <th className="py-2 pr-4">Maelezo</th>
                  <th className="py-2 pr-4">Deadline</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {duties.map((d) => (
                  <tr key={d.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4 font-medium">{d.title}</td>
                    <td className="py-2 pr-4">{d.description ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {d.due_date?.slice(0, 10) ?? "-"}
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={d.status}
                        onChange={(e) => onDutyStatusChange(d.id, e.target.value)}
                        disabled={dutyBusyId === d.id}
                        className="rounded border border-zinc-300 px-2 py-1 text-xs"
                      >
                        {DUTY_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {viewerIsAdmin && (
                        <button
                          onClick={() => onDeleteDuty(d.id)}
                          disabled={dutyBusyId === d.id}
                          className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                        >
                          Futa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "performance" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">Idadi ya Ziara (Visits) — Mwezi Huu</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">0</p>
          <p className="mt-3 text-sm text-zinc-500">
            Kipengele hiki kinakuja hivi karibuni.
          </p>
        </div>
      )}
    </div>
  );
}
