"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListToolbar } from "../../_components/list-toolbar";
import { DAILY_SESSIONS, DAILY_SESSION_LABELS, type DailySession } from "@/lib/daily-reports";

interface Visit {
  id: string;
  patient_id: string;
  patient_name: string;
  staff_name: string | null;
  visit_date: string;
  visit_session: DailySession | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  location: string | null;
  treatment_notes: string | null;
  notes: string | null;
}

interface StaffSummary {
  staff_id: string | null;
  staff_name: string | null;
  completed: number;
  scheduled: number;
  cancelled: number;
}

interface Option {
  id: string;
  full_name: string;
  address?: string | null;
}

const STATUS_LABELS: Record<Visit["status"], string> = {
  COMPLETED: "Completed",
  SCHEDULED: "Scheduled",
  CANCELLED: "Cancelled",
};

const STATUS_CLASSES: Record<Visit["status"], string> = {
  COMPLETED: "text-green-700",
  SCHEDULED: "text-amber-700",
  CANCELLED: "text-red-700",
};

const CSV_COLUMNS = [
  { key: "visit_date", label: "Date" },
  { key: "session", label: "Session" },
  { key: "staff_name", label: "Nurse" },
  { key: "patient_name", label: "Patient" },
  { key: "service", label: "Service / Procedure" },
  { key: "notes", label: "Notes" },
  { key: "status", label: "Status" },
];

/** Today's date and month in East Africa Time, whatever the device clock zone. */
function eatToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dar_es_Salaam" }).format(new Date());
}

type MonthResult =
  | {
      ok: true;
      data: { visits?: Visit[]; summary?: StaffSummary[]; staff?: Option[]; patients?: Option[] };
    }
  | { ok: false; error: string };

async function fetchMonth(month: string, staffId: string): Promise<MonthResult> {
  try {
    const params = new URLSearchParams({ month });
    if (staffId) params.set("staffId", staffId);
    const res = await fetch(`/api/part-time-visits?${params}`);
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? "Could not load Part-time visits." };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "Network error." };
  }
}

export function PartTimeVisitsView() {
  const [month, setMonth] = useState(() => eatToday().slice(0, 7));
  const [staffFilter, setStaffFilter] = useState("");

  const [visits, setVisits] = useState<Visit[]>([]);
  const [summary, setSummary] = useState<StaffSummary[]>([]);
  const [staff, setStaff] = useState<Option[]>([]);
  const [patients, setPatients] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form
  const [visitDate, setVisitDate] = useState(eatToday);
  const [staffId, setStaffId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [visitSession, setVisitSession] = useState<DailySession | "">("");
  const [status, setStatus] = useState<Visit["status"]>("COMPLETED");
  const [location, setLocation] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const apply = (result: MonthResult) => {
    if (result.ok) {
      setVisits(result.data.visits ?? []);
      setSummary(result.data.summary ?? []);
      setStaff(result.data.staff ?? []);
      setPatients(result.data.patients ?? []);
    }
    setLoadError(result.ok ? null : result.error);
    setLoading(false);
  };

  useEffect(() => {
    let current = true;
    fetchMonth(month, staffFilter).then((result) => {
      if (current) apply(result);
    });
    return () => {
      current = false;
    };
  }, [month, staffFilter]);

  const load = async () => {
    setLoading(true);
    apply(await fetchMonth(month, staffFilter));
  };

  const onPatientChange = (id: string) => {
    setPatientId(id);
    const p = patients.find((x) => x.id === id);
    if (p?.address && !location) setLocation(p.address);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaved(false);
    if (!staffId) return setFormError("Select the nurse who made the visit.");
    if (!patientId) return setFormError("Select a patient.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/part-time-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          staffId,
          visitDate,
          visitSession,
          status,
          location,
          treatmentNotes,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Could not record the visit.");
        return;
      }
      setPatientId("");
      setLocation("");
      setTreatmentNotes("");
      setNotes("");
      setSaved(true);
      await load();
    } catch {
      setFormError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const totals = summary.reduce(
    (acc, s) => ({
      completed: acc.completed + s.completed,
      scheduled: acc.scheduled + s.scheduled,
      cancelled: acc.cancelled + s.cancelled,
    }),
    { completed: 0, scheduled: 0, cancelled: 0 }
  );

  const csvRows = visits.map((v) => ({
    visit_date: v.visit_date,
    session: v.visit_session ? DAILY_SESSION_LABELS[v.visit_session] : "",
    staff_name: v.staff_name ?? "",
    patient_name: v.patient_name,
    service: v.treatment_notes ?? "",
    notes: v.notes ?? "",
    status: STATUS_LABELS[v.status],
  }));

  const inputClass = "rounded border border-zinc-300 px-2 py-1.5 text-sm";
  const labelClass = "text-xs font-medium text-zinc-600";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Part-time Visits</h1>
        <p className="text-sm text-zinc-500">
          Record visits made by part-time nurses and see each nurse&apos;s total for the month.
        </p>
      </div>

      {/* Record form */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Record a Part-time Visit</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Date</span>
              <input
                type="date"
                value={visitDate}
                max={eatToday()}
                onChange={(e) => setVisitDate(e.target.value)}
                className={inputClass}
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Nurse</span>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={inputClass}>
                <option value="">Select nurse…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Patient</span>
              <select value={patientId} onChange={(e) => onPatientChange(e.target.value)} className={inputClass}>
                <option value="">Select patient…</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Session (optional)</span>
              <select
                value={visitSession}
                onChange={(e) => setVisitSession(e.target.value as DailySession | "")}
                className={inputClass}
              >
                <option value="">—</option>
                {DAILY_SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {DAILY_SESSION_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Visit["status"])}
                className={inputClass}
              >
                <option value="COMPLETED">Completed</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 sm:col-span-1 lg:col-span-3">
              <span className={labelClass}>Location</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Patient's home address"
                maxLength={300}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelClass}>Service / Procedure</span>
              <textarea
                value={treatmentNotes}
                onChange={(e) => setTreatmentNotes(e.target.value)}
                placeholder="e.g. Wound dressing, injection, catheter change"
                maxLength={2000}
                rows={2}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className={labelClass}>Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
                rows={2}
                className={inputClass}
              />
            </label>
          </div>
          {formError && <p className="text-sm text-red-700">{formError}</p>}
          {saved && <p className="text-sm text-green-700">Visit recorded.</p>}
          <div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-brand-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Record Visit"}
            </button>
          </div>
        </form>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              if (!e.target.value) return;
              setLoading(true);
              setMonth(e.target.value);
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Nurse</span>
          <select
            value={staffFilter}
            onChange={(e) => {
              setLoading(true);
              setStaffFilter(e.target.value);
            }}
            className={inputClass}
          >
            <option value="">All nurses</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto">
          <ListToolbar filename={`part-time-visits-${month}`} columns={CSV_COLUMNS} rows={csvRows} />
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {loadError}{" "}
          <button onClick={load} className="font-medium underline">
            Retry
          </button>
        </div>
      )}

      {/* Per-nurse totals */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Totals by Nurse</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : summary.length === 0 ? (
          <p className="text-sm text-zinc-500">No Part-time visits in this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="py-2 pr-4 font-medium">Nurse</th>
                  <th className="py-2 pr-4 text-right font-medium">Completed</th>
                  <th className="py-2 pr-4 text-right font-medium">Scheduled</th>
                  <th className="py-2 pr-4 text-right font-medium">Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.staff_id ?? "none"} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4">{s.staff_name ?? "Unassigned"}</td>
                    <td className="py-2 pr-4 text-right font-medium">{s.completed}</td>
                    <td className="py-2 pr-4 text-right">{s.scheduled}</td>
                    <td className="py-2 pr-4 text-right">{s.cancelled}</td>
                  </tr>
                ))}
                <tr className="border-t border-zinc-300 font-semibold">
                  <td className="py-2 pr-4">Total</td>
                  <td className="py-2 pr-4 text-right">{totals.completed}</td>
                  <td className="py-2 pr-4 text-right">{totals.scheduled}</td>
                  <td className="py-2 pr-4 text-right">{totals.cancelled}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visit list */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Visits ({visits.length})</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-zinc-500">No Part-time visits in this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Nurse</th>
                  <th className="py-2 pr-4 font-medium">Patient</th>
                  <th className="py-2 pr-4 font-medium">Service / Procedure</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 print:hidden" />
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v.id} className="border-b border-zinc-100 align-top last:border-0">
                    <td className="whitespace-nowrap py-2 pr-4">
                      {v.visit_date}
                      {v.visit_session && (
                        <span className="block text-xs text-zinc-500">
                          {DAILY_SESSION_LABELS[v.visit_session]}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{v.staff_name ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <Link href={`/patients/${v.patient_id}`} className="text-brand-blue hover:underline">
                        {v.patient_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{v.treatment_notes ?? "—"}</td>
                    <td className={`py-2 pr-4 font-medium ${STATUS_CLASSES[v.status]}`}>
                      {STATUS_LABELS[v.status]}
                    </td>
                    <td className="py-2 pr-4 text-right print:hidden">
                      <Link href={`/home-visits/${v.id}`} className="text-xs font-medium text-brand-blue underline">
                        Open
                      </Link>
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
