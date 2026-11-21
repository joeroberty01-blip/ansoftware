"use client";

import { useCallback, useEffect, useState } from "react";
import { ListToolbar } from "../_components/list-toolbar";
import { formatDistance, mapsUrl } from "@/lib/geo";

interface Row {
  id: string;
  staff_name: string;
  staff_number: string | null;
  patient_id: string | null;
  patient_name: string | null;
  patient_home_lat: string | null;
  check_in_at: string;
  check_in_lat: string;
  check_in_lng: string;
  check_in_accuracy_m: string | null;
  check_in_distance_m: number | null;
  late_minutes: number;
  check_out_at: string | null;
  check_out_lat: string | null;
  check_out_lng: string | null;
  check_out_distance_m: number | null;
  has_photo: boolean;
  minutes_worked: number | null;
}

interface SummaryRow {
  staff_id: string;
  full_name: string;
  staff_number: string | null;
  days: number;
  shifts: number;
  minutes_worked: number;
  late_days: number;
  late_minutes: number;
  away_check_ins: number;
  no_home_check_ins: number;
  open_shifts: number;
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" });
const hours = (m: number | null) =>
  m == null ? "-" : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

function localToday() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function shiftDay(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function Distance({ m, near, hasHome }: { m: number | null; near: number; hasHome: boolean }) {
  if (m == null) {
    return <span className="text-xs text-zinc-500">{hasHome ? "-" : "Nyumbani hapajawekwa"}</span>;
  }
  const ok = m <= near;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        ok ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-800"
      }`}
    >
      {ok ? "✓" : "⚠"} {formatDistance(m)}
    </span>
  );
}

export default function AttendancePage() {
  const [view, setView] = useState<"day" | "month">("day");
  const [date, setDate] = useState(localToday);
  const [month, setMonth] = useState(() => localToday().slice(0, 7));
  const [rows, setRows] = useState<Row[]>([]);
  const [missing, setMissing] = useState<{ staff_id: string; full_name: string }[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [near, setNear] = useState(200);
  const [shiftStart, setShiftStartValue] = useState("07:00");
  const [savedShift, setSavedShift] = useState("07:00");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = view === "day" ? `/api/attendance?date=${date}` : `/api/attendance?month=${month}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindikana kupakia mahudhurio.");
        return;
      }
      setNear(json.nearMeters ?? 200);
      if (view === "day") {
        setRows(json.rows ?? []);
        setMissing(json.missing ?? []);
        setShiftStartValue(json.shiftStart);
        setSavedShift(json.shiftStart);
      } else {
        setSummary(json.summary ?? []);
      }
    } catch {
      setError("Hakuna mtandao. Jaribu tena.");
    } finally {
      setLoading(false);
    }
  }, [view, date, month]);

  useEffect(() => {
    load();
  }, [load]);

  const saveShift = async () => {
    const res = await fetch("/api/attendance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftStart }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Imeshindikana kuhifadhi muda.");
      return;
    }
    setSavedShift(json.shiftStart);
  };

  const setHome = async (r: Row) => {
    if (
      !window.confirm(
        `Weka mahali pa check-in hii (${r.staff_name}, ${time(r.check_in_at)}) kama nyumbani kwa ${r.patient_name}? Check-in zijazo zitapimwa kutoka hapa.`
      )
    ) {
      return;
    }
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/attendance/${r.id}/set-home`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Imeshindikana.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const late = rows.filter((r) => r.late_minutes > 0).length;
  const away = rows.filter((r) => r.check_in_distance_m != null && r.check_in_distance_m > near).length;
  const staffIn = new Set(rows.map((r) => r.staff_name)).size;

  const csvRows = summary.map((s) => ({
    ...s,
    hours: hours(s.minutes_worked),
  }));

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Mahudhurio ya Staff</h1>
        <p className="text-sm text-zinc-500">
          Check-in na check-out za staff kwa wagonjwa: saa, mahali (GPS) na selfie.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 print:hidden" role="tablist">
        {(["day", "month"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`min-h-9 rounded-lg px-4 text-sm font-semibold ${
              view === v ? "bg-brand-blue text-white" : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {v === "day" ? "Kwa siku" : "Muhtasari wa mwezi"}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {view === "day" ? (
        <>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setDate((d) => shiftDay(d, -1))}
              className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              ← Jana
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Tarehe"
              className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            />
            {date < localToday() && (
              <button
                type="button"
                onClick={() => setDate((d) => shiftDay(d, 1))}
                className="min-h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Kesho →
              </button>
            )}
            <span className="mx-1 hidden h-6 w-px bg-zinc-200 sm:block" />
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              Zamu inaanza
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStartValue(e.target.value)}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </label>
            {shiftStart !== savedShift && (
              <button
                type="button"
                onClick={saveShift}
                className="min-h-9 rounded-lg bg-brand-blue px-3 text-sm font-semibold text-white hover:bg-brand-blue-dark"
              >
                Hifadhi
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Staff walioingia", value: staffIn },
              { label: "Walichelewa", value: late, warn: late > 0 },
              { label: `Mbali na nyumbani (> m ${near})`, value: away, warn: away > 0 },
              { label: "Hawajaingia", value: missing.length, warn: missing.length > 0 },
            ].map((c) => (
              <div
                key={c.label}
                className={`rounded-xl border p-4 shadow-sm ${
                  c.warn ? "border-orange-200 bg-orange-50" : "border-zinc-200 bg-white"
                }`}
              >
                <p className="text-xs font-medium text-zinc-600">{c.label}</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-zinc-500">Hakuna check-in kwa siku hii.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="py-2 pr-4">Staff</th>
                      <th className="py-2 pr-4">Mgonjwa</th>
                      <th className="py-2 pr-4">Aliingia</th>
                      <th className="py-2 pr-4">Umbali</th>
                      <th className="py-2 pr-4">Alitoka</th>
                      <th className="py-2 pr-4">Masaa</th>
                      <th className="py-2 pr-4">Selfie</th>
                      <th className="py-2 pr-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-zinc-100 align-top last:border-0">
                        <td className="py-2 pr-4 font-medium text-zinc-900">{r.staff_name}</td>
                        <td className="py-2 pr-4">{r.patient_name ?? "-"}</td>
                        <td className="py-2 pr-4">
                          <span className="block">{time(r.check_in_at)}</span>
                          {r.late_minutes > 0 && (
                            <span className="text-xs font-semibold text-red-700">
                              amechelewa dk {r.late_minutes}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="flex flex-col items-start gap-1">
                            <Distance m={r.check_in_distance_m} near={near} hasHome={!!r.patient_home_lat} />
                            <a
                              href={mapsUrl(r.check_in_lat, r.check_in_lng)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-blue underline"
                            >
                              Ramani
                              {r.check_in_accuracy_m ? ` (±m ${Math.round(Number(r.check_in_accuracy_m))})` : ""}
                            </a>
                          </span>
                        </td>
                        <td className="py-2 pr-4">
                          {r.check_out_at && !r.check_out_lat ? (
                            <span className="text-xs font-semibold text-amber-700">Hakubonyeza Naondoka</span>
                          ) : r.check_out_at ? (
                            <span className="flex flex-col items-start gap-1">
                              {time(r.check_out_at)}
                              <Distance m={r.check_out_distance_m} near={near} hasHome={!!r.patient_home_lat} />
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-700">Bado kazini</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">{hours(r.minutes_worked)}</td>
                        <td className="py-2 pr-4">
                          {r.has_photo ? (
                            <a href={`/api/attendance/${r.id}/photo`} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image */}
                              <img
                                src={`/api/attendance/${r.id}/photo`}
                                alt={`Selfie ya ${r.staff_name}`}
                                loading="lazy"
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {r.patient_id &&
                            (!r.patient_home_lat ||
                              (r.check_in_distance_m != null && r.check_in_distance_m > near)) && (
                              <button
                                type="button"
                                onClick={() => setHome(r)}
                                disabled={busyId === r.id}
                                className="text-xs font-semibold text-brand-blue underline disabled:opacity-50"
                              >
                                Weka hapa kama nyumbani kwa mgonjwa
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

          {missing.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <h2 className="text-sm font-semibold text-orange-900">
                Hawajaingia {date === localToday() ? "leo" : "siku hii"} ({missing.length})
              </h2>
              <p className="mt-1 text-sm text-orange-900">{missing.map((m) => m.full_name).join(", ")}</p>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              aria-label="Mwezi"
              className="rounded-lg border border-zinc-300 px-2 py-2 text-sm"
            />
            <ListToolbar
              filename={`mahudhurio-${month}`}
              columns={[
                { key: "full_name", label: "Staff" },
                { key: "staff_number", label: "Namba" },
                { key: "days", label: "Siku" },
                { key: "shifts", label: "Zamu" },
                { key: "hours", label: "Masaa" },
                { key: "minutes_worked", label: "Dakika" },
                { key: "late_days", label: "Siku alizochelewa" },
                { key: "late_minutes", label: "Dakika za kuchelewa" },
                { key: "away_check_ins", label: "Check-in mbali na nyumbani" },
                { key: "no_home_check_ins", label: "Check-in bila nyumbani kuwekwa" },
                { key: "open_shifts", label: "Zamu hazijafungwa" },
              ]}
              rows={csvRows}
            />
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-5">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : summary.length === 0 ? (
              <p className="text-sm text-zinc-500">Hakuna mahudhurio kwa mwezi huu.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="py-2 pr-4">Staff</th>
                      <th className="py-2 pr-4">Siku</th>
                      <th className="py-2 pr-4">Masaa</th>
                      <th className="py-2 pr-4">Alichelewa</th>
                      <th className="py-2 pr-4">Mbali na nyumbani</th>
                      <th className="py-2 pr-4">Hazijafungwa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s) => (
                      <tr key={s.staff_id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-2 pr-4 font-medium text-zinc-900">
                          {s.full_name}
                          {s.staff_number && <span className="block text-xs text-zinc-500">{s.staff_number}</span>}
                        </td>
                        <td className="py-2 pr-4">{s.days}</td>
                        <td className="py-2 pr-4">{hours(s.minutes_worked)}</td>
                        <td className="py-2 pr-4">
                          {s.late_days > 0 ? `siku ${s.late_days} (dk ${s.late_minutes})` : "-"}
                        </td>
                        <td className="py-2 pr-4">{s.away_check_ins > 0 ? s.away_check_ins : "-"}</td>
                        <td className="py-2 pr-4">{s.open_shifts > 0 ? s.open_shifts : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
