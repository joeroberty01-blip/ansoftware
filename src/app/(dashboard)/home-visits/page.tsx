"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";
import { hasVitalsAlert } from "@/lib/vitals";
import {
  DAILY_SESSIONS,
  DAILY_SESSION_LABELS,
  NO_SESSION_LABEL,
  dayOf,
  groupDailyReports,
  sessionState,
} from "@/lib/daily-reports";

const CSV_COLUMNS = [
  { key: "visit_date", label: "Tarehe" },
  { key: "visit_session", label: "Muda" },
  { key: "visit_type", label: "Aina" },
  { key: "patient_name", label: "Mgonjwa" },
  { key: "staff_name", label: "Staff" },
  { key: "location", label: "Location" },
  { key: "blood_pressure", label: "BP" },
  { key: "temperature", label: "Joto (°C)" },
  { key: "pulse", label: "Pulse" },
  { key: "blood_glucose", label: "Sukari" },
  { key: "spo2", label: "SpO2 (%)" },
  { key: "weight", label: "Uzito (kg)" },
  { key: "food_intake", label: "Chakula" },
  { key: "treatment_notes", label: "Matibabu / Procedures" },
  { key: "notes", label: "Maendeleo / Maelezo" },
  { key: "status", label: "Status" },
];

interface Visit {
  id: string;
  patient_id: string;
  patient_name: string;
  staff_name: string | null;
  visit_date: string;
  visit_session: string | null;
  visit_type: string;
  status: string;
  location: string | null;
  check_in_lat: string | null;
  check_in_lng: string | null;
  blood_pressure: string | null;
  temperature: string | null;
  pulse: number | null;
  blood_glucose: string | null;
  spo2: number | null;
  food_intake: string | null;
  treatment_notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Zote" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const WEEKDAYS = ["Jumapili", "Jumatatu", "Jumanne", "Jumatano", "Alhamisi", "Ijumaa", "Jumamosi"];
const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? "";

/** The patient's single report for that day, opened at one part. */
const dailyHref = (patientId: string, date: string, session?: string | null) =>
  `/patients/${patientId}/daily/${date}${session ? `#${session}` : ""}`;

const SESSION_ORDER: Record<string, number> = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };

/** One session slot of a daily report: a link per entry, or a dash. */
function SessionCell({ entries }: { entries: Visit[] }) {
  if (entries.length === 0) {
    return <span className="text-zinc-400">—</span>;
  }
  return (
    <span className="flex flex-col gap-1">
      {entries.map((v) => (
        <Link
          key={v.id}
          href={dailyHref(v.patient_id, dayOf(v.visit_date), v.visit_session)}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
            v.status === "COMPLETED"
              ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              : v.status === "SCHEDULED"
                ? "bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "bg-zinc-100 text-zinc-500 line-through"
          }`}
        >
          {v.status === "COMPLETED" ? "✓" : v.status === "SCHEDULED" ? "Imepangwa" : "Imeghairiwa"}
          {v.blood_pressure ? ` · BP ${v.blood_pressure}` : ""}
          {hasVitalsAlert(v) && (
            <span title="Vitals nje ya kawaida" className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          )}
        </Link>
      ))}
    </span>
  );
}

export default function HomeVisitsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get("staffId") ?? "";
  const [visits, setVisits] = useState<Visit[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (staffId) params.set("staffId", staffId);
    const res = await fetch(`/api/home-visits?${params.toString()}`);
    const json = await res.json();
    setVisits(json.visits ?? []);
    setLoading(false);
  }, [status, staffId]);

  useEffect(() => {
    load();
  }, [load]);

  // One report per patient per day; patients A to Z within a day.
  const reports = useMemo(() => {
    const byName = [...visits].sort((a, b) => a.patient_name.localeCompare(b.patient_name));
    return groupDailyReports(byName);
  }, [visits]);
  const showOther = reports.some((r) => r.other.length > 0);

  // CSV keeps one row per entry, ordered day, patient, then session.
  const csvRows = useMemo(
    () =>
      reports.flatMap((r) =>
        [...r.visits].sort(
          (a, b) =>
            (SESSION_ORDER[a.visit_session ?? ""] ?? 3) - (SESSION_ORDER[b.visit_session ?? ""] ?? 3)
        )
      ),
    [reports]
  );

  const staffNames = (list: Visit[]) =>
    [...new Set(list.map((v) => v.staff_name).filter(Boolean))].join(", ") || "-";

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Home Visits</h1>
          <p className="text-sm text-zinc-500">
            Ripoti moja kwa kila mgonjwa kwa siku: Asubuhi, Mchana na Jioni.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ListToolbar filename="home-visits" columns={CSV_COLUMNS} rows={csvRows} />
          <Link
            href="/home-visits/new"
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark print:hidden"
          >
            Rekodi Ziara Mpya
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Chuja kwa status"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-base sm:max-w-xs sm:py-1.5 sm:text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {staffId && (
          <span className="flex items-center gap-1.5 rounded-full bg-brand-blue-light px-3 py-1 text-xs font-medium text-brand-blue">
            Filtered by staff member
            <Link href="/home-visits" className="underline">
              Clear
            </Link>
          </span>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna home visits bado.</p>
        ) : (
          <>
            {/* Phone: a card per daily report with its three sessions. */}
            <ul className="flex flex-col gap-2 md:hidden print:hidden">
              {reports.map((r) => {
                const first = r.visits[0];
                const filled = DAILY_SESSIONS.filter((s) => sessionState(r.sessions[s]) === "done").length;
                return (
                  <li key={r.key} className="rounded-lg border border-zinc-200 p-3">
                    <Link href={dailyHref(r.patientId, r.date)} className="block">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-zinc-900">{first.patient_name}</p>
                          <p className="text-sm text-zinc-500">
                            {weekdayOf(r.date)}, {r.date}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                          {filled}/3
                        </span>
                      </div>
                    </Link>
                    <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                      {DAILY_SESSIONS.map((s) => (
                        <div key={s} className="flex items-start justify-between gap-2">
                          <dt className="pt-1 text-xs font-semibold text-zinc-500">
                            {DAILY_SESSION_LABELS[s]}
                          </dt>
                          <dd className="min-w-0 text-right">
                            <SessionCell entries={r.sessions[s]} />
                          </dd>
                        </div>
                      ))}
                      {r.other.length > 0 && (
                        <div className="flex items-start justify-between gap-2">
                          <dt className="pt-1 text-xs font-semibold text-zinc-500">{NO_SESSION_LABEL}</dt>
                          <dd className="min-w-0 text-right">
                            <SessionCell entries={r.other} />
                          </dd>
                        </div>
                      )}
                    </dl>
                    <p className="mt-2 truncate text-xs text-zinc-500">Nesi: {staffNames(r.visits)}</p>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto md:block print:block">
              <table className="w-full text-left text-sm" data-keep-table>
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4">Tarehe</th>
                    <th className="py-2 pr-4">Mgonjwa</th>
                    {DAILY_SESSIONS.map((s) => (
                      <th key={s} className="py-2 pr-4">
                        {DAILY_SESSION_LABELS[s]}
                      </th>
                    ))}
                    {showOther && <th className="py-2 pr-4">{NO_SESSION_LABEL}</th>}
                    <th className="py-2 pr-4">Nesi</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr
                      key={r.key}
                      onClick={() => router.push(dailyHref(r.patientId, r.date))}
                      className="cursor-pointer border-b border-zinc-100 align-top last:border-0 hover:bg-zinc-50"
                    >
                      <td className="whitespace-nowrap py-2 pr-4">
                        <span className="block text-xs text-zinc-500">{weekdayOf(r.date)}</span>
                        {r.date}
                      </td>
                      <td className="py-2 pr-4 font-medium text-zinc-900">{r.visits[0].patient_name}</td>
                      {DAILY_SESSIONS.map((s) => (
                        <td key={s} className="py-2 pr-4">
                          <SessionCell entries={r.sessions[s]} />
                        </td>
                      ))}
                      {showOther && (
                        <td className="py-2 pr-4">
                          <SessionCell entries={r.other} />
                        </td>
                      )}
                      <td className="py-2 pr-4 text-zinc-700">{staffNames(r.visits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
