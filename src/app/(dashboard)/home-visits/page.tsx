"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";
import { hasVitalsAlert } from "@/lib/vitals";

const VISIT_SESSION_LABELS: Record<string, string> = {
  MORNING: "Asubuhi",
  AFTERNOON: "Mchana",
  EVENING: "Jioni",
};

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
}

const STATUS_OPTIONS = [
  { value: "", label: "Zote" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

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

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (v: Visit) => {
    if (
      !window.confirm(`Futa home visit ya ${v.patient_name} (${v.visit_date.slice(0, 10)})?`)
    ) {
      return;
    }
    setDeletingId(v.id);
    try {
      const res = await fetch(`/api/home-visits/${v.id}`, { method: "DELETE" });
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
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Home Visits</h1>
        <div className="flex flex-wrap gap-2">
          <ListToolbar
            filename="home-visits"
            columns={CSV_COLUMNS}
            rows={visits}
          />
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
        ) : visits.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna home visits bado.</p>
        ) : (
          <>
          {/* On a phone the table would need sideways scrolling to reach
              Location, BP and Status. A card per visit shows all of it at
              once; the table returns from md up and on paper. */}
          <ul className="flex flex-col gap-2 md:hidden print:hidden">
            {visits.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/home-visits/${v.id}`}
                  className="block rounded-lg border border-zinc-200 p-3 active:bg-zinc-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900">{v.patient_name}</p>
                      <p className="text-sm text-zinc-500">
                        {v.visit_date.slice(0, 10)} ·{" "}
                        {v.visit_session ? VISIT_SESSION_LABELS[v.visit_session] ?? v.visit_session : "-"} ·{" "}
                        {v.visit_type === "PART_TIME" ? "Part-time" : "Full-time"}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                      {v.status}
                      {hasVitalsAlert(v) && (
                        <span title="Vitals nje ya kawaida" className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      )}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                    <div className="min-w-0">
                      <dt className="text-xs text-zinc-500">Staff</dt>
                      <dd className="truncate text-zinc-800">{v.staff_name ?? "-"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-zinc-500">BP</dt>
                      <dd className="text-zinc-800">{v.blood_pressure ?? "-"}</dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-xs text-zinc-500">Location</dt>
                      <dd className="truncate text-zinc-800">{v.location ?? "-"}</dd>
                    </div>
                  </dl>
                </Link>
                <div className="mt-1 flex items-center justify-end gap-4 px-1">
                  {v.check_in_lat && v.check_in_lng && (
                    <a
                      href={`https://www.google.com/maps?q=${v.check_in_lat},${v.check_in_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 text-sm font-medium text-brand-blue"
                    >
                      📍 Ramani
                    </a>
                  )}
                  <button
                    onClick={() => onDelete(v)}
                    disabled={deletingId === v.id}
                    className="py-2 text-sm font-medium text-red-700 disabled:opacity-50"
                  >
                    Futa
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto md:block print:block">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4">Muda</th>
                <th className="py-2 pr-4">Aina</th>
                <th className="py-2 pr-4">Mgonjwa</th>
                <th className="py-2 pr-4">Staff</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">BP</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`/home-visits/${v.id}`)}
                  className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4">{v.visit_date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    {v.visit_session
                      ? VISIT_SESSION_LABELS[v.visit_session] ?? v.visit_session
                      : "-"}
                  </td>
                  <td className="py-2 pr-4">
                    {v.visit_type === "PART_TIME" ? "Part-time" : "Full-time"}
                  </td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/home-visits/${v.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-zinc-900 underline"
                    >
                      {v.patient_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{v.staff_name ?? "-"}</td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-1.5">
                      {v.location ?? "-"}
                      {v.check_in_lat && v.check_in_lng && (
                        <a
                          href={`https://www.google.com/maps?q=${v.check_in_lat},${v.check_in_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="GPS check-in imerekodiwa — bofya kuona ramani"
                          className="text-brand-blue"
                        >
                          📍
                        </a>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{v.blood_pressure ?? "-"}</td>
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-1">
                      {v.status}
                      {hasVitalsAlert(v) && (
                        <span
                          title="Vitals nje ya kawaida"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
                        />
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right print:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(v);
                      }}
                      disabled={deletingId === v.id}
                      className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                    >
                      Futa
                    </button>
                  </td>
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
