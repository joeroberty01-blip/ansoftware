"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ListToolbar } from "../../_components/list-toolbar";
import { formatDistance, mapsUrl, NEAR_HOME_METERS } from "@/lib/geo";
import { clock, type TodayRow } from "./attendance-today";

interface Row extends TodayRow {
  work_date: string;
  check_out_lng: string | null;
  minutes_worked: number | null;
}

const hours = (m: number | null) =>
  m == null ? "-" : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

/** One staff member's check-ins for a month: selfie, time, location, hours. */
export function AttendanceTab({ staffId, staffName }: { staffId: string; staffName: string }) {
  const [month, setMonth] = useState("");
  const [thisMonth, setThisMonth] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestNo = useRef(0);

  const load = useCallback(
    async (m: string) => {
      const no = ++requestNo.current;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/attendance/staff/${staffId}${m ? `?month=${m}` : ""}`);
        const json = await res.json().catch(() => ({}));
        if (no !== requestNo.current) return;
        if (!res.ok) {
          setError(json.error ?? "Could not load attendance.");
          return;
        }
        setMonth(json.month);
        setThisMonth(json.today.slice(0, 7));
        setRows(json.rows);
      } catch {
        if (no === requestNo.current) setError("No network connection. Please try again.");
      } finally {
        if (no === requestNo.current) setLoading(false);
      }
    },
    [staffId]
  );

  useEffect(() => {
    load("");
  }, [load]);

  const days = new Set(rows.map((r) => r.work_date)).size;
  const worked = rows.reduce((sum, r) => sum + (r.minutes_worked ?? 0), 0);
  const lateDays = rows.filter((r) => r.late_minutes > 0).length;

  const csvRows = rows.map((r) => ({
    date: r.work_date,
    patient: r.patient_name,
    check_in: clock(r.check_in_at),
    check_out: r.check_out_at && r.check_out_lat ? clock(r.check_out_at) : "",
    hours: hours(r.minutes_worked),
    late: r.late_minutes,
    location: `${r.check_in_lat},${r.check_in_lng}`,
    accuracy: r.check_in_accuracy_m,
    distance: r.check_in_distance_m,
  }));

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <input
          type="month"
          aria-label="Month"
          value={month}
          max={thisMonth}
          onChange={(e) => e.target.value && load(e.target.value)}
          className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
        />
        <ListToolbar
          filename={`attendance-${staffName}-${month}`}
          columns={[
            { key: "date", label: "Date" },
            { key: "patient", label: "Patient" },
            { key: "check_in", label: "Check in" },
            { key: "check_out", label: "Check out" },
            { key: "hours", label: "Hours" },
            { key: "late", label: "Minutes late" },
            { key: "location", label: "Location" },
            { key: "accuracy", label: "GPS accuracy (m)" },
            { key: "distance", label: "Distance from home (m)" },
          ]}
          rows={csvRows}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          { label: "Days", value: String(days) },
          { label: "Hours worked", value: hours(worked) },
          { label: "Late days", value: String(lateDays) },
        ].map((c) => (
          <div key={c.label} className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs text-zinc-500">{c.label}</p>
            <p className="text-lg font-bold text-zinc-900">{c.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="mt-3 text-sm text-zinc-500">Loading...</p>
      ) : rows.length === 0 ? (
        !error && <p className="mt-3 text-sm text-zinc-500">No check-ins this month.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs text-zinc-500">
                <th className="py-2 pr-4">Selfie</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Check in</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">Check out</th>
                <th className="py-2">Hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-zinc-100 align-top last:border-0">
                  <td className="py-2 pr-4">
                    {r.has_photo ? (
                      <a
                        href={`/api/attendance/${r.id}/photo`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image */}
                        <img
                          src={`/api/attendance/${r.id}/photo`}
                          alt={`Selfie on ${r.work_date}`}
                          loading="lazy"
                          className="h-14 w-14 rounded-lg object-cover"
                        />
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{r.work_date}</td>
                  <td className="py-2 pr-4">{r.patient_name ?? "-"}</td>
                  <td className="py-2 pr-4">
                    <span className="block">
                      <span className="font-semibold">{clock(r.check_in_at)}</span>
                      {r.late_minutes > 0 && (
                        <span className="block text-xs font-semibold text-red-700">
                          {r.late_minutes} min late
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="block">
                      <a
                        href={mapsUrl(r.check_in_lat, r.check_in_lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-brand-blue underline"
                      >
                        Map
                        {r.check_in_accuracy_m ? ` (±${Math.round(Number(r.check_in_accuracy_m))} m)` : ""}
                      </a>
                      {r.check_in_distance_m != null && (
                        <span
                          className={`block text-xs ${
                            r.check_in_distance_m <= NEAR_HOME_METERS
                              ? "text-emerald-700"
                              : "text-orange-700"
                          }`}
                        >
                          {formatDistance(r.check_in_distance_m)} from home
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2 pr-4">
                    {r.check_out_at
                      ? r.check_out_lat
                        ? clock(r.check_out_at)
                        : "Did not check out"
                      : "On shift"}
                  </td>
                  <td className="py-2">{hours(r.minutes_worked)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
