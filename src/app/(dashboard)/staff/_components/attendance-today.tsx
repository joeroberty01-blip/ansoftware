"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDistance, mapsUrl, NEAR_HOME_METERS } from "@/lib/geo";

export interface TodayRow {
  id: string;
  staff_id: string;
  staff_name: string;
  patient_name: string | null;
  check_in_at: string;
  check_in_lat: string;
  check_in_lng: string;
  check_in_accuracy_m: string | null;
  check_in_distance_m: number | null;
  late_minutes: number;
  check_out_at: string | null;
  check_out_lat: string | null;
  has_photo: boolean;
}

export interface AttendanceToday {
  rows: TodayRow[];
  missing: { staff_id: string; full_name: string }[];
}

const REFRESH_MS = 30000;

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dar_es_Salaam",
  });

/** Today's check-ins, refreshed by itself while the page is open. */
export function useAttendanceToday(): { data: AttendanceToday | null; failed: boolean } {
  const [data, setData] = useState<AttendanceToday | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/attendance");
      const json = await res.json();
      if (!res.ok) throw new Error();
      setData({ rows: json.rows ?? [], missing: json.missing ?? [] });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const run = () => {
      if (!document.hidden) load();
    };
    run();
    const timer = setInterval(run, REFRESH_MS);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [load]);

  return { data, failed };
}

/** The newest check-in of one staff member today, for the staff table. */
export function TodayCell({ staffId, data }: { staffId: string; data: AttendanceToday | null }) {
  if (!data) return <span className="text-xs text-zinc-400">...</span>;
  const row = [...data.rows].reverse().find((r) => r.staff_id === staffId);
  if (row) {
    return (
      <span className="flex items-center gap-2">
        {row.has_photo && (
          // eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image
          <img
            src={`/api/attendance/${row.id}/photo`}
            alt=""
            loading="lazy"
            className="h-8 w-8 shrink-0 rounded-full object-cover"
          />
        )}
        <span className="text-xs">
          <span className="block font-semibold whitespace-nowrap text-emerald-700">
            {row.check_out_at
              ? row.check_out_lat
                ? `${clock(row.check_in_at)} – ${clock(row.check_out_at)}`
                : `In ${clock(row.check_in_at)}`
              : `In ${clock(row.check_in_at)}`}
          </span>
          {row.late_minutes > 0 && (
            <span className="block text-red-700">{row.late_minutes} min late</span>
          )}
        </span>
      </span>
    );
  }
  return data.missing.some((m) => m.staff_id === staffId) ? (
    <span className="text-xs font-semibold text-orange-700">Not checked in</span>
  ) : (
    <span className="text-xs text-zinc-400">-</span>
  );
}

export function AttendanceTodayPanel({
  data,
  failed,
}: {
  data: AttendanceToday | null;
  failed: boolean;
}) {
  const rows = data ? [...data.rows].sort((a, b) => b.check_in_at.localeCompare(a.check_in_at)) : [];
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900">
          Attendance Today{data ? ` (${new Set(rows.map((r) => r.staff_id)).size} checked in)` : ""}
        </h2>
        <Link
          href="/attendance"
          className="text-xs font-semibold text-brand-blue hover:underline print:hidden"
        >
          Full attendance →
        </Link>
      </div>

      {failed && (
        <p className="mt-2 text-xs text-red-700">
          Could not refresh attendance. It will try again by itself.
        </p>
      )}
      {!data && !failed ? (
        <p className="mt-3 text-sm text-zinc-500">Loading...</p>
      ) : rows.length === 0 && data ? (
        <p className="mt-3 text-sm text-zinc-500">No one has checked in yet today.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id} className="flex gap-3 rounded-xl border border-zinc-200 p-3">
              {r.has_photo ? (
                <a
                  href={`/api/attendance/${r.id}/photo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image */}
                  <img
                    src={`/api/attendance/${r.id}/photo`}
                    alt={`Selfie of ${r.staff_name}`}
                    loading="lazy"
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                </a>
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs text-zinc-500">
                  No photo
                </span>
              )}
              <div className="min-w-0 text-xs text-zinc-600">
                <Link
                  href={`/staff/${r.staff_id}?tab=attendance`}
                  className="block text-sm font-semibold break-words text-zinc-900 hover:underline"
                >
                  {r.staff_name}
                </Link>
                <span className="block break-words">{r.patient_name ?? "-"}</span>
                <span className="block">
                  <b className="text-zinc-900">{clock(r.check_in_at)}</b>
                  {r.late_minutes > 0 && (
                    <span className="ml-1 font-semibold text-red-700">{r.late_minutes} min late</span>
                  )}
                  {" · "}
                  {r.check_out_at
                    ? r.check_out_lat
                      ? `out ${clock(r.check_out_at)}`
                      : "did not check out"
                    : "on shift"}
                </span>
                <a
                  href={mapsUrl(r.check_in_lat, r.check_in_lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand-blue underline"
                >
                  Location
                  {r.check_in_accuracy_m ? ` (±${Math.round(Number(r.check_in_accuracy_m))} m)` : ""}
                </a>
                {r.check_in_distance_m != null && (
                  <span
                    className={`block font-semibold ${
                      r.check_in_distance_m <= NEAR_HOME_METERS ? "text-emerald-700" : "text-orange-700"
                    }`}
                  >
                    {formatDistance(r.check_in_distance_m)} from the patient&apos;s home
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && data.missing.length > 0 && (
        <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-900">
          <b>Not checked in ({data.missing.length}):</b>{" "}
          {data.missing.map((m) => m.full_name).join(", ")}
        </p>
      )}
    </section>
  );
}
