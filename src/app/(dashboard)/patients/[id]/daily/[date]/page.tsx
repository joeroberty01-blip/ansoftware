"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { vitalsAlertReasons } from "@/lib/vitals";
import { useGeoCheckIn } from "@/lib/use-geo-checkin";
import {
  DAILY_SESSIONS,
  DAILY_SESSION_LABELS,
  NO_SESSION_LABEL,
  dayOf,
  sessionState,
  type DailySession,
} from "@/lib/daily-reports";
import { GeoCheckInButton } from "../../../../_components/geo-checkin-button";

interface Visit {
  id: string;
  patient_id: string;
  visit_date: string;
  visit_session: string | null;
  visit_type: string;
  status: string;
  staff_name: string | null;
  location: string | null;
  blood_pressure: string | null;
  temperature: string | null;
  pulse: number | null;
  weight: string | null;
  height_cm: string | null;
  blood_glucose: string | null;
  spo2: number | null;
  food_intake: string | null;
  treatment_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Patient {
  id: string;
  full_name: string;
  patient_number: string | null;
  address: string | null;
  allergies: string | null;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function localToday(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

const inputClass = "w-full rounded border border-zinc-300 px-2 py-2 text-base sm:py-1.5 sm:text-sm";

/**
 * One part (morning, afternoon or evening) of the day's report. Saving it
 * fills that part only; the day stays one report.
 */
function SessionSection({
  patient,
  date,
  session,
  entry,
  canFill,
  onSaved,
}: {
  patient: Patient;
  date: string;
  session: DailySession;
  entry: Visit | null;
  canFill: boolean;
  onSaved: () => Promise<void>;
}) {
  const filled = entry?.status === "COMPLETED";
  const [open, setOpen] = useState(!filled);
  const [bp, setBp] = useState(entry?.blood_pressure ?? "");
  const [temp, setTemp] = useState(entry?.temperature ?? "");
  const [pulse, setPulse] = useState(entry?.pulse != null ? String(entry.pulse) : "");
  const [weight, setWeight] = useState(entry?.weight ?? "");
  const [glucose, setGlucose] = useState(entry?.blood_glucose ?? "");
  const [spo2, setSpo2] = useState(entry?.spo2 != null ? String(entry.spo2) : "");
  const [food, setFood] = useState(entry?.food_intake ?? "");
  const [treatment, setTreatment] = useState(entry?.treatment_notes ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<string[] | null>(null);
  const geo = useGeoCheckIn();
  const label = DAILY_SESSION_LABELS[session];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fields = {
      bloodPressure: bp || undefined,
      temperature: temp || undefined,
      pulse: pulse ? Number(pulse) : undefined,
      weight: weight || undefined,
      bloodGlucose: glucose || undefined,
      spo2: spo2 ? Number(spo2) : undefined,
      foodIntake: food || undefined,
      treatmentNotes: treatment || undefined,
      notes: notes || undefined,
    };
    try {
      const res = filled
        ? await fetch(`/api/home-visits/${entry!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          })
        : await fetch("/api/home-visits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fields,
              patientId: patient.id,
              visitDate: date,
              visitSession: session,
              status: "COMPLETED",
              location: patient.address || undefined,
              checkInLat: geo.checkIn?.lat,
              checkInLng: geo.checkIn?.lng,
              checkInAccuracyM: geo.checkIn?.accuracy,
            }),
          });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `Could not save ${label.toLowerCase()}.`);
        return;
      }
      const reasons = vitalsAlertReasons({
        blood_pressure: bp || null,
        temperature: temp || null,
        pulse: pulse ? Number(pulse) : null,
        blood_glucose: glucose || null,
        spo2: spo2 ? Number(spo2) : null,
      });
      setAlerts(reasons.length > 0 ? reasons : null);
      await onSaved();
    } catch {
      setError("No network connection. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const summary = [
    entry?.blood_pressure ? `BP ${entry.blood_pressure}` : null,
    entry?.temperature ? `Temp ${entry.temperature}°C` : null,
    entry?.pulse != null ? `Pulse ${entry.pulse}` : null,
    entry?.blood_glucose ? `Glucose ${entry.blood_glucose}` : null,
    entry?.spo2 != null ? `SpO₂ ${entry.spo2}%` : null,
    entry?.weight ? `Weight ${entry.weight}kg` : null,
  ].filter(Boolean);

  return (
    <section id={session} className="scroll-mt-20 border-t border-zinc-200 pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-zinc-900">
          {filled ? "✓" : "○"} {label}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            filled
              ? "bg-emerald-100 text-emerald-700"
              : entry?.status === "SCHEDULED"
                ? "bg-amber-100 text-amber-800"
                : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {filled ? "Filled in" : entry?.status === "SCHEDULED" ? "Scheduled, not filled in yet" : "Not filled in"}
        </span>
      </div>
      {filled && entry && (
        <p className="mt-1 text-xs text-zinc-500">
          {[
            entry.staff_name,
            `saved ${new Date(entry.updated_at).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {filled && !open ? (
        <div className="mt-2">
          <p className="text-sm text-zinc-800">
            {summary.length > 0 ? summary.join(" · ") : "No vitals recorded."}
          </p>
          {[
            { k: "Food Intake", v: entry?.food_intake },
            { k: "Treatment / Procedures", v: entry?.treatment_notes },
            { k: "Progress / Notes", v: entry?.notes },
          ]
            .filter((b) => b.v)
            .map((b) => (
              <p key={b.k} className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-800">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{b.k}: </span>
                {b.v}
              </p>
            ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-2 min-h-9 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Edit {label.toLowerCase()}
          </button>
        </div>
      ) : !canFill ? (
        <p className="mt-2 text-sm text-zinc-500">This day hasn't come yet.</p>
      ) : (
        <form onSubmit={save} className="mt-3 flex flex-col gap-3">
          {!filled && (
            <GeoCheckInButton
              checkIn={geo.checkIn}
              checking={geo.checking}
              error={geo.error}
              onCapture={geo.captureLocation}
            />
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              BP
              <input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="120/80" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Temp (°C)
              <input value={temp} onChange={(e) => setTemp(e.target.value)} inputMode="decimal" placeholder="36.5" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Pulse
              <input value={pulse} onChange={(e) => setPulse(e.target.value)} inputMode="numeric" placeholder="80" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Glucose (mmol/L)
              <input value={glucose} onChange={(e) => setGlucose(e.target.value)} inputMode="decimal" placeholder="5.5" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              SpO₂ (%)
              <input value={spo2} onChange={(e) => setSpo2(e.target.value)} inputMode="numeric" placeholder="97" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
              Weight (kg)
              <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className={inputClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Food Intake
            <input value={food} onChange={(e) => setFood(e.target.value)} placeholder="e.g. Had porridge and tea" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Treatment / Procedures
            <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} rows={2} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Patient progress / Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </label>
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : `Save ${label.toLowerCase()}`}
            </button>
            {filled && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>
            )}
          </div>
        </form>
      )}
      {alerts && (
        <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
          <p className="font-semibold">Warning: vitals are outside the normal range</p>
          <ul className="mt-1 list-inside list-disc">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** The day's single report for one patient: morning, afternoon and evening. */
export default function DailyReportPage() {
  const params = useParams<{ id: string; date: string }>();
  const router = useRouter();
  const patientId = params.id;
  const date = isIsoDate(params.date) ? params.date : localToday();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, v] = await Promise.all([
        fetch(`/api/patients/${patientId}`).then((r) => r.json().then((j) => ({ ok: r.ok, j }))),
        fetch(`/api/home-visits?patientId=${patientId}&date=${date}`).then((r) => r.json()),
      ]);
      if (!p.ok) {
        setLoadError(p.j.error ?? "Patient not found.");
      } else {
        setPatient(p.j.patient);
        setVisits((v.visits ?? []).filter((x: Visit) => dayOf(x.visit_date) === date));
      }
    } catch {
      setLoadError("No network connection. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [patientId, date]);

  useEffect(() => {
    load();
  }, [load]);

  // Field staff must check in at this patient's home before filling today's report.
  const [needCheckIn, setNeedCheckIn] = useState(false);
  useEffect(() => {
    fetch("/api/attendance/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const mine = j?.staff && j.staff.profession !== "ADMIN_STAFF";
        const checkedIn = (j?.today ?? []).some(
          (a: { patient_id: string | null }) => a.patient_id === patientId
        );
        setNeedCheckIn(Boolean(mine && j.date === date && !checkedIn));
      })
      .catch(() => undefined);
  }, [date, patientId]);

  if (loading) return <div className="p-6 text-sm text-zinc-500">Loading...</div>;
  if (loadError || !patient) {
    return <div className="p-6 text-sm text-red-700">{loadError ?? "Not found."}</div>;
  }

  const today = localToday();
  const canFill = date <= today;
  const bySession = (s: DailySession) =>
    visits
      .filter((v) => v.visit_session === s && v.status !== "CANCELLED")
      .sort((a, b) => Number(b.status === "COMPLETED") - Number(a.status === "COMPLETED"))[0] ?? null;
  const other = visits.filter((v) => !v.visit_session);
  const filledCount = DAILY_SESSIONS.filter(
    (s) => sessionState(visits.filter((v) => v.visit_session === s)) === "done"
  ).length;
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <Link href={`/patients/${patient.id}`} className="text-sm font-medium text-brand-blue">
          ← {patient.full_name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">Daily Report</h1>
        <p className="text-sm text-zinc-600">
          {patient.full_name}
          {patient.patient_number ? ` (${patient.patient_number})` : ""} · {weekday}, {date}
          {date === today ? " · Today" : ""}
        </p>
        {patient.allergies && (
          <p className="mt-1 text-xs font-semibold text-red-700">Allergies: {patient.allergies}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href={`/patients/${patient.id}/daily/${shiftDay(date, -1)}`}
          className="min-h-9 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          ← Previous day
        </Link>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && router.push(`/patients/${patient.id}/daily/${e.target.value}`)}
          aria-label="Choose a date"
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
        />
        {date < today && (
          <Link
            href={`/patients/${patient.id}/daily/${shiftDay(date, 1)}`}
            className="min-h-9 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Next day →
          </Link>
        )}
        <a
          href={`/api/patients/${patient.id}/visit-reports/pdf?from=${date}&to=${date}`}
          className="min-h-9 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Download PDF
        </a>
      </div>

      {needCheckIn && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          <p className="font-semibold">You haven't checked in at this patient's home today.</p>
          <p className="mt-1">
            Tap &quot;Check in&quot; (selfie and GPS) first, then come back to fill in the report.
          </p>
          <Link
            href="/dashboard#mahudhurio"
            className="mt-2 inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark"
          >
            Go to Attendance
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-3">
          {DAILY_SESSIONS.map((s) => {
            const done = sessionState(visits.filter((v) => v.visit_session === s)) === "done";
            return (
              <a
                key={s}
                href={`#${s}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  done ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {done ? "✓" : "○"} {DAILY_SESSION_LABELS[s]}
              </a>
            );
          })}
          <span className="text-xs text-zinc-500">{filledCount}/3 filled in</span>
        </div>

        <div className="flex flex-col gap-4">
          {DAILY_SESSIONS.map((s) => {
            const entry = bySession(s);
            return (
              <SessionSection
                key={`${s}-${entry?.id ?? "new"}-${entry?.updated_at ?? ""}`}
                patient={patient}
                date={date}
                session={s}
                entry={entry}
                canFill={canFill}
                onSaved={load}
              />
            );
          })}
        </div>

        {other.length > 0 && (
          <div className="mt-4 border-t border-zinc-200 pt-4">
            <h2 className="text-sm font-bold text-zinc-700">{NO_SESSION_LABEL}</h2>
            <p className="text-xs text-zinc-500">Older reports without a session; they stay as they are.</p>
            <ul className="mt-2 flex flex-col gap-1">
              {other.map((v) => (
                <li key={v.id}>
                  <Link href={`/home-visits/${v.id}`} className="text-sm text-brand-blue underline">
                    {v.staff_name ?? "Report"} · {v.blood_pressure ? `BP ${v.blood_pressure}` : v.status}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
