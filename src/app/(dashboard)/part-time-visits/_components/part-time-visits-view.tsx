"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ListToolbar } from "../../_components/list-toolbar";
import type { PartTimeOptions, PartTimeVisit } from "@/lib/repo/part-time-visits";
import {
  COVER_REASONS,
  PART_TIME_REASON_LABELS,
  PART_TIME_REASONS,
  type PartTimeReason,
} from "@/lib/validation/part-time-visits";
import { PayPanel, METHOD_LABELS } from "./pay-panel";

/** Value of the "who visited" list meaning "type a name instead". */
const OUTSIDE = "__outside__";

interface FormState {
  staffId: string;
  externalName: string;
  externalPhone: string;
  patientId: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  reasonNote: string;
  coveredStaffId: string;
  notes: string;
}

const emptyForm = (date: string): FormState => ({
  staffId: "",
  externalName: "",
  externalPhone: "",
  patientId: "",
  visitDate: date,
  startTime: "",
  endTime: "",
  reason: "",
  reasonNote: "",
  coveredStaffId: "",
  notes: "",
});

const reasonLabel = (r: string | null) =>
  r ? PART_TIME_REASON_LABELS[r as PartTimeReason] ?? r : "Not recorded";

const timeRange = (v: PartTimeVisit) =>
  v.start_time ? `${v.start_time}${v.end_time ? ` – ${v.end_time}` : ""}` : "-";

const money = (n: number) => `TZS ${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const payTotal = (rows: PartTimeVisit[]) =>
  rows.reduce((sum, v) => sum + Number(v.pay_amount ?? 0), 0);

const isCover = (r: string) => COVER_REASONS.includes(r as PartTimeReason);

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";
const labelClass = "mb-1 block text-xs font-medium text-zinc-600";

/** Counts visits per key, most first. */
function tally(rows: PartTimeVisit[], key: (v: PartTimeVisit) => string) {
  const counts = new Map<string, number>();
  rows.forEach((v) => counts.set(key(v), (counts.get(key(v)) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function PartTimeVisitsView() {
  const [month, setMonth] = useState("");
  const [today, setToday] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [payFor, setPayFor] = useState<PartTimeVisit | null>(null);
  const [visits, setVisits] = useState<PartTimeVisit[]>([]);
  const [staff, setStaff] = useState<PartTimeOptions["staff"]>([]);
  const [patients, setPatients] = useState<PartTimeOptions["patients"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [staffFilter, setStaffFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const requestNo = useRef(0);

  const load = useCallback(async (m: string) => {
    // Only the latest request may fill the page (months clicked quickly).
    const no = ++requestNo.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/part-time-visits${m ? `?month=${m}` : ""}`);
      const json = await res.json().catch(() => ({}));
      if (no !== requestNo.current) return;
      if (!res.ok) {
        setError(json.error ?? "Could not load part-time visits.");
        return;
      }
      setMonth(json.month);
      setToday(json.today);
      setIsAdmin(!!json.isAdmin);
      setVisits(json.visits);
      setStaff(json.staff);
      setPatients(json.patients);
    } catch {
      if (no === requestNo.current) setError("No network connection. Please try again.");
    } finally {
      if (no === requestNo.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const openForm = (state: FormState, id: string | null) => {
    setForm(state);
    setPayFor(null);
    setEditingId(id);
    setFormError(null);
    setMessage(null);
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  };

  const closeForm = () => {
    setForm(null);
    setEditingId(null);
    setFormError(null);
  };

  const set = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  // The nurse usually covered is the one assigned to that patient: suggest
  // them, unless someone else was already picked by hand.
  const suggestCovered = (f: FormState, patientId: string, reason: string) => {
    if (!isCover(reason)) return "";
    const suggestionFor = (id: string) =>
      patients.find((p) => p.id === id)?.assigned_staff_id ?? "";
    if (f.coveredStaffId && f.coveredStaffId !== suggestionFor(f.patientId)) return f.coveredStaffId;
    const next = suggestionFor(patientId);
    return next === f.staffId ? "" : next;
  };

  const editVisit = (v: PartTimeVisit) =>
    openForm(
      {
        staffId: v.external_name ? OUTSIDE : v.staff_id ?? "",
        externalName: v.external_name ?? "",
        externalPhone: v.external_phone ?? "",
        patientId: v.patient_id,
        visitDate: v.visit_date,
        startTime: v.start_time ?? "",
        endTime: v.end_time ?? "",
        reason: v.reason ?? "",
        reasonNote: v.reason_note ?? "",
        coveredStaffId: v.covered_staff_id ?? "",
        notes: v.notes ?? "",
      },
      v.id
    );

  /** A part-time home visit report has no reason yet: start a record from it. */
  const addReason = (v: PartTimeVisit) =>
    openForm(
      {
        ...emptyForm(v.visit_date),
        staffId: v.staff_id ?? "",
        patientId: v.patient_id,
      },
      null
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setFormError(null);
    const outside = form.staffId === OUTSIDE;
    try {
      const res = await fetch(
        editingId ? `/api/part-time-visits/${editingId}` : "/api/part-time-visits",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            staffId: outside ? "" : form.staffId,
            externalName: outside ? form.externalName : "",
            externalPhone: outside ? form.externalPhone : "",
            coveredStaffId: isCover(form.reason) ? form.coveredStaffId : "",
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error ?? "Could not save the visit.");
        return;
      }
      const savedMonth = form.visitDate.slice(0, 7);
      setMessage(editingId ? "Visit updated." : "Part-time visit recorded.");
      closeForm();
      await load(savedMonth);
    } catch {
      setFormError("No network connection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const cancelVisit = async (v: PartTimeVisit) => {
    const reason = window.prompt(
      `Cancel the record of ${v.staff_name} visiting ${v.patient_name} on ${v.visit_date}?\nIt stays on file, marked as cancelled. Write the reason:`
    );
    if (reason === null) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/part-time-visits/${v.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not cancel the record.");
        return;
      }
      if (editingId === v.id) closeForm();
      setMessage("Record cancelled. It stays on file.");
      await load(month);
    } catch {
      setError("No network connection. Please try again.");
    }
  };

  const undoPaid = async (v: PartTimeVisit) => {
    const reason = window.prompt(
      `Undo the payment of ${money(Number(v.pay_amount))} to ${v.staff_name}?\nUse this only if it was marked as paid by mistake. Write the reason:`
    );
    if (reason === null) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/part-time-visits/${v.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UNDO_PAID", reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not undo the payment.");
        return;
      }
      setMessage("Payment undone. The visit is unpaid again and its expense no longer counts.");
      await load(month);
    } catch {
      setError("No network connection. Please try again.");
    }
  };

  const active = visits.filter((v) => !v.voided_at);
  const cancelledCount = visits.length - active.length;
  const matches = (v: PartTimeVisit) =>
    (!staffFilter || v.staff_name === staffFilter) &&
    (!reasonFilter || (v.reason ?? "NONE") === reasonFilter);
  const shown = (showCancelled ? visits : active).filter(matches);
  const counted = active.filter(matches);
  const byStaff = tally(counted, (v) => v.staff_name);
  const byReason = tally(counted, (v) => reasonLabel(v.reason));
  const paidRows = counted.filter((v) => v.paid_at);
  const unpaidRows = counted.filter((v) => v.pay_amount && !v.paid_at);
  const noAmount = counted.filter((v) => v.origin === "REGISTER" && !v.pay_amount).length;
  const payByPerson = (name: string) => payTotal(counted.filter((v) => v.staff_name === name));
  const staffNames = [...new Set(active.map((v) => v.staff_name))].sort();

  const csvRows = shown.map((v) => ({
    visit_date: v.visit_date,
    time: timeRange(v),
    staff_name: v.staff_name,
    from: v.external_name ? "Outside the ERP" : "ERP staff",
    patient_name: v.patient_name,
    reason: reasonLabel(v.reason),
    reason_note: v.reason_note,
    covered_staff_name: v.covered_staff_name,
    notes: v.notes,
    pay_amount: v.pay_amount,
    pay_reason: v.pay_reason,
    pay_status: v.paid_at ? "Paid" : v.pay_amount ? "Unpaid" : "Amount not set",
    paid_on: v.paid_at?.slice(0, 10),
    payment_method: v.payment_method ? METHOD_LABELS[v.payment_method] ?? v.payment_method : "",
    payment_reference: v.payment_reference,
    recorded_by: v.created_by_name,
    status: v.voided_at ? `Cancelled: ${v.void_reason}` : "Recorded",
  }));

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Part-time Visits</h1>
          <p className="text-sm text-zinc-500">
            Staff who visited patients as part-time, and why they were needed.
          </p>
        </div>
        {!form && (
          <button
            type="button"
            onClick={() => openForm(emptyForm(today), null)}
            disabled={!today}
            className="min-h-10 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50 print:hidden"
          >
            + Record Part-time Visit
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      {form && (
        <form
          ref={formRef}
          onSubmit={submit}
          className="scroll-mt-20 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 print:hidden"
        >
          <h2 className="text-base font-semibold text-zinc-900">
            {editingId ? "Edit Part-time Visit" : "Record Part-time Visit"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="pt-staff">
                Who visited
              </label>
              <select
                id="pt-staff"
                required
                value={form.staffId}
                onChange={(e) =>
                  set({
                    staffId: e.target.value,
                    coveredStaffId:
                      form.coveredStaffId === e.target.value ? "" : form.coveredStaffId,
                  })
                }
                className={inputClass}
              >
                <option value="">-- select staff --</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                    {s.active ? "" : " (not active)"}
                  </option>
                ))}
                <option value={OUTSIDE}>Someone not in the ERP...</option>
              </select>
            </div>

            {form.staffId === OUTSIDE && (
              <>
                <div>
                  <label className={labelClass} htmlFor="pt-name">
                    Their full name
                  </label>
                  <input
                    id="pt-name"
                    required
                    maxLength={200}
                    value={form.externalName}
                    onChange={(e) => set({ externalName: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="pt-phone">
                    Their phone (optional)
                  </label>
                  <input
                    id="pt-phone"
                    type="tel"
                    maxLength={30}
                    value={form.externalPhone}
                    onChange={(e) => set({ externalPhone: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            <div>
              <label className={labelClass} htmlFor="pt-patient">
                Patient
              </label>
              <select
                id="pt-patient"
                required
                value={form.patientId}
                onChange={(e) =>
                  set({
                    patientId: e.target.value,
                    coveredStaffId: suggestCovered(form, e.target.value, form.reason),
                  })
                }
                className={inputClass}
              >
                <option value="">-- select patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="pt-date">
                Visit date
              </label>
              <input
                id="pt-date"
                type="date"
                required
                max={today}
                value={form.visitDate}
                onChange={(e) => set({ visitDate: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="pt-start">
                  From (optional)
                </label>
                <input
                  id="pt-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set({ startTime: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pt-end">
                  To (optional)
                </label>
                <input
                  id="pt-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set({ endTime: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="pt-reason">
                Reason for part-time
              </label>
              <select
                id="pt-reason"
                required
                value={form.reason}
                onChange={(e) =>
                  set({
                    reason: e.target.value,
                    coveredStaffId: suggestCovered(form, form.patientId, e.target.value),
                  })
                }
                className={inputClass}
              >
                <option value="">-- select reason --</option>
                {PART_TIME_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {PART_TIME_REASON_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {isCover(form.reason) && (
              <div>
                <label className={labelClass} htmlFor="pt-covered">
                  In place of (optional)
                </label>
                <select
                  id="pt-covered"
                  value={form.coveredStaffId}
                  onChange={(e) => set({ coveredStaffId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">-- none --</option>
                  {staff
                    .filter((s) => s.id !== form.staffId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name}
                        {s.active ? "" : " (not active)"}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass} htmlFor="pt-note">
                {form.reason === "OTHER" ? "Explain the reason" : "More about the reason (optional)"}
              </label>
              <input
                id="pt-note"
                required={form.reason === "OTHER"}
                maxLength={500}
                value={form.reasonNote}
                onChange={(e) => set({ reasonNote: e.target.value })}
                placeholder="e.g. Nurse travelled for a family emergency, back on Friday"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className={labelClass} htmlFor="pt-notes">
                What was done / other notes (optional)
              </label>
              <textarea
                id="pt-notes"
                rows={3}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="min-h-10 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Visit"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="min-h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </form>
      )}

      {payFor && (
        <PayPanel
          key={payFor.id}
          visit={payFor}
          onClose={() => setPayFor(null)}
          onSaved={async (text) => {
            setPayFor(null);
            setMessage(text);
            await load(month);
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <input
          type="month"
          aria-label="Month"
          value={month}
          max={today.slice(0, 7)}
          onChange={(e) => {
            if (!e.target.value) return;
            setStaffFilter("");
            setReasonFilter("");
            setMessage(null);
            load(e.target.value);
          }}
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
        />
        <select
          aria-label="Filter by staff"
          value={staffFilter}
          onChange={(e) => setStaffFilter(e.target.value)}
          className="max-w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
        >
          <option value="">All staff</option>
          {staffNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by reason"
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="max-w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm"
        >
          <option value="">All reasons</option>
          {PART_TIME_REASONS.map((r) => (
            <option key={r} value={r}>
              {PART_TIME_REASON_LABELS[r]}
            </option>
          ))}
          <option value="NONE">Not recorded</option>
        </select>
        {cancelledCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            Show cancelled ({cancelledCount})
          </label>
        )}
        <div className="sm:ml-auto">
          <ListToolbar
            filename={`part-time-visits-${month}`}
            columns={[
              { key: "visit_date", label: "Date" },
              { key: "time", label: "Time" },
              { key: "staff_name", label: "Who visited" },
              { key: "from", label: "From" },
              { key: "patient_name", label: "Patient" },
              { key: "reason", label: "Reason" },
              { key: "reason_note", label: "Reason details" },
              { key: "covered_staff_name", label: "In place of" },
              { key: "notes", label: "Notes" },
              ...(isAdmin
                ? [
                    { key: "pay_amount", label: "Amount (TZS)" },
                    { key: "pay_reason", label: "Amount reason" },
                    { key: "pay_status", label: "Payment" },
                    { key: "paid_on", label: "Paid on" },
                    { key: "payment_method", label: "Method" },
                    { key: "payment_reference", label: "Reference" },
                  ]
                : []),
              { key: "recorded_by", label: "Recorded by" },
              { key: "status", label: "Status" },
            ]}
            rows={csvRows}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Part-time visits", value: counted.length },
          { label: "People who visited", value: byStaff.length },
          { label: "Patients visited", value: new Set(counted.map((v) => v.patient_id)).size },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-medium text-zinc-600">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{c.value}</p>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Paid", value: money(payTotal(paidRows)), warn: false },
            { label: "Unpaid", value: money(payTotal(unpaidRows)), warn: unpaidRows.length > 0 },
            { label: "Visits with no amount yet", value: noAmount, warn: noAmount > 0 },
          ].map((c) => (
            <div
              key={c.label}
              className={`rounded-xl border p-3 shadow-sm sm:p-4 ${
                c.warn ? "border-orange-200 bg-orange-50" : "border-zinc-200 bg-white"
              }`}
            >
              <p className="text-xs font-medium text-zinc-600">{c.label}</p>
              <p className="mt-1 text-xl font-bold text-zinc-900">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {counted.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { title: "Visits per person", rows: byStaff, pay: isAdmin },
            { title: "Visits per reason", rows: byReason, pay: false },
          ].map((t) => (
            <div key={t.title} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-900">{t.title}</h2>
              <ul className="mt-2 divide-y divide-zinc-100">
                {t.rows.map(([name, n]) => (
                  <li key={name} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="min-w-0 break-words text-zinc-700">{name}</span>
                    <span className="shrink-0 text-right">
                      <span className="font-semibold text-zinc-900">{n}</span>
                      {t.pay && payByPerson(name) > 0 && (
                        <span className="ml-2 text-xs text-zinc-500">{money(payByPerson(name))}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {visits.length === 0
              ? "No part-time visits recorded for this month."
              : "No visits match these filters."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Who visited</th>
                  <th className="py-2 pr-4">Patient</th>
                  <th className="py-2 pr-4">Reason</th>
                  <th className="py-2 pr-4">In place of</th>
                  <th className="py-2 pr-4">Notes</th>
                  {isAdmin && <th className="py-2 pr-4">Pay</th>}
                  <th className="py-2 pr-4">Recorded by</th>
                  <th className="py-2 print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-b border-zinc-100 align-top ${v.voided_at ? "text-zinc-400" : ""}`}
                  >
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="block">
                        <span className={v.voided_at ? "line-through" : "font-medium text-zinc-900"}>
                          {v.visit_date}
                        </span>
                        {v.start_time && <span className="block text-xs">{timeRange(v)}</span>}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="block">
                        {v.staff_name}
                        {v.external_name && (
                          <span className="block text-xs text-zinc-500">
                            Outside the ERP{v.external_phone ? ` · ${v.external_phone}` : ""}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/patients/${v.patient_id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {v.patient_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="block">
                        <span className={v.reason ? "" : "font-semibold text-amber-700"}>
                          {reasonLabel(v.reason)}
                        </span>
                        {v.reason_note && (
                          <span className="block text-xs text-zinc-500">{v.reason_note}</span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{v.covered_staff_name ?? "-"}</td>
                    <td className="max-w-xs py-2 pr-4 break-words whitespace-pre-wrap">
                      {v.notes ?? "-"}
                    </td>
                    {isAdmin && (
                      <td className="py-2 pr-4">
                        {v.pay_amount ? (
                          <span className="block">
                            <span className="block font-medium whitespace-nowrap">
                              {money(Number(v.pay_amount))}
                            </span>
                            <span
                              className={`block text-xs font-semibold ${
                                v.paid_at ? "text-emerald-700" : "text-orange-700"
                              }`}
                            >
                              {v.paid_at
                                ? `Paid ${new Date(v.paid_at).toLocaleDateString("en-GB")}${
                                    v.payment_method
                                      ? ` · ${METHOD_LABELS[v.payment_method] ?? v.payment_method}`
                                      : ""
                                  }${v.payment_reference ? ` · ${v.payment_reference}` : ""}`
                                : "Unpaid"}
                            </span>
                            <span className="block text-xs text-zinc-500">{v.pay_reason}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Not set</span>
                        )}
                      </td>
                    )}
                    <td className="py-2 pr-4 text-xs">{v.created_by_name}</td>
                    <td className="py-2 print:hidden">
                      {v.voided_at ? (
                        <span className="text-xs">
                          Cancelled by {v.voided_by_name}: {v.void_reason}
                        </span>
                      ) : v.paid_at ? (
                        <button
                          type="button"
                          onClick={() => undoPaid(v)}
                          className="text-xs font-semibold text-red-700 hover:underline"
                        >
                          Undo payment
                        </button>
                      ) : v.origin === "VISIT_REPORT" ? (
                        <span className="flex flex-wrap gap-3">
                          <Link
                            href={`/home-visits/${v.home_visit_id}`}
                            className="text-xs font-semibold text-brand-blue hover:underline"
                          >
                            View report
                          </Link>
                          {v.staff_id && (
                            <button
                              type="button"
                              onClick={() => addReason(v)}
                              className="text-xs font-semibold text-brand-blue hover:underline"
                            >
                              Add reason
                            </button>
                          )}
                        </span>
                      ) : (
                        <span className="flex flex-wrap gap-3">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                closeForm();
                                setMessage(null);
                                setPayFor(v);
                              }}
                              className="text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              {v.pay_amount ? "Pay" : "Set amount"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => editVisit(v)}
                            className="text-xs font-semibold text-brand-blue hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelVisit(v)}
                            className="text-xs font-semibold text-red-700 hover:underline"
                          >
                            Cancel
                          </button>
                        </span>
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
