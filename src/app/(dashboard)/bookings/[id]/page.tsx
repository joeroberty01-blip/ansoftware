"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BOOKING_SOURCES,
  BOOKING_SOURCE_LABELS,
  FOLLOW_UP_CHANNELS,
  FOLLOW_UP_CHANNEL_LABELS,
  type BookingSource,
  type FollowUpChannel,
} from "@/lib/validation/bookings";

interface Booking {
  id: string;
  full_name: string;
  phone: string;
  service_type: string;
  preferred_date: string | null;
  status: string;
  assigned_staff_id: string | null;
  staff_name: string | null;
  patient_id: string | null;
  patient_name: string | null;
  notes: string | null;
  source: string | null;
  source_detail: string | null;
  next_follow_up_date: string | null;
  created_at: string;
}

interface FollowUp {
  id: string;
  channel: string;
  note: string;
  next_follow_up_date: string | null;
  created_by_name: string | null;
  created_at: string;
}

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** The plan's rhythm: day 1, 3, 7, then a reminder at day 30. */
const QUICK_DATES = [
  { days: 1, label: "Kesho" },
  { days: 3, label: "Siku 3" },
  { days: 7, label: "Wiki 1" },
  { days: 30, label: "Siku 30" },
];

function followUpLabel(date: string | null, status: string) {
  if (status === "COMPLETED" || status === "CANCELLED") return "Ombi limefungwa";
  if (!date) return "Hakuna tarehe ya kufuatilia";
  const day = date.slice(0, 10);
  const today = todayLocal();
  if (day < today) return `Imechelewa: ${day}`;
  if (day === today) return "Fuatilia leo";
  return `Fuatilia: ${day}`;
}

interface StaffOption {
  id: string;
  full_name: string;
}

interface PatientOption {
  id: string;
  full_name: string;
}

const STATUS_BADGES: Record<string, string> = {
  NEW: "bg-orange-100 text-orange-700",
  ASSIGNED: "bg-brand-blue-light text-brand-blue",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState("");
  const [linkPatientId, setLinkPatientId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [fuChannel, setFuChannel] = useState<FollowUpChannel>("CALL");
  const [fuNote, setFuNote] = useState("");
  const [fuNext, setFuNext] = useState(() => addDays(1));
  const [fuMessage, setFuMessage] = useState<string | null>(null);
  const [source, setSource] = useState<BookingSource | "">("");
  const [sourceDetail, setSourceDetail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings/${id}`);
    const json = await res.json();
    setBooking(json.booking ?? null);
    setStaffId(json.booking?.assigned_staff_id ?? "");
    setSource((json.booking?.source as BookingSource | null) ?? "");
    setSourceDetail(json.booking?.source_detail ?? "");
    const fu = await fetch(`/api/bookings/${id}/followups`).then((r) => r.json());
    setFollowUps(fu.followUps ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/staff")
      .then((r) => r.json())
      .then((json: { staff?: { id: string; full_name: string }[] }) =>
        setStaffOptions(
          (json.staff ?? []).map((s) => ({ id: s.id, full_name: s.full_name }))
        )
      );
    fetch("/api/patients")
      .then((r) => r.json())
      .then((json: { patients?: PatientOption[] }) =>
        setPatientOptions(json.patients ?? [])
      );
  }, [load]);

  const onAssignStaff = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedStaffId: staffId,
          status: booking?.status === "NEW" ? "ASSIGNED" : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kupangia staff.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onLinkPatient = async () => {
    if (!linkPatientId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: linkPatientId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuunganisha mgonjwa.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onConvertToPatient = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}/convert-to-patient`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kutengeneza mgonjwa mpya.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const onSetStatus = async (status: string) => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kubadilisha status.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const saveFollowUp = async (closeAs?: "COMPLETED" | "CANCELLED") => {
    setError(null);
    setFuMessage(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: fuChannel,
          note: fuNote,
          nextFollowUpDate: closeAs ? null : fuNext || null,
          status: closeAs,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuhifadhi ufuatiliaji.");
        return;
      }
      setFuNote("");
      setFuMessage(
        closeAs
          ? "Imehifadhiwa na ombi limefungwa."
          : fuNext
            ? `Imehifadhiwa. Kumfuatilia tena: ${fuNext}.`
            : "Imehifadhiwa. Hakuna tarehe ya kufuatilia tena."
      );
      await load();
    } finally {
      setBusy(false);
    }
  };

  const saveSource = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: source || undefined,
          sourceDetail,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuhifadhi chanzo.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Loading...</div>;
  }
  if (!booking) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {booking.full_name}
          </h1>
          <p className="text-sm text-zinc-600">
            {booking.service_type} — {booking.phone}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_BADGES[booking.status] ?? "bg-zinc-100 text-zinc-600"
          }`}
        >
          {booking.status}
        </span>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Maelezo ya Booking
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Tarehe Anayopendelea</span>
              <span>{booking.preferred_date?.slice(0, 10) ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Ilitengenezwa</span>
              <span>{booking.created_at.slice(0, 10)}</span>
            </div>
            {booking.notes && (
              <div>
                <span className="text-zinc-500">Maelezo</span>
                <p className="mt-1">{booking.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
              <button
                type="button"
                onClick={() => onSetStatus("CANCELLED")}
                disabled={busy}
                className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Ghairi Booking
              </button>
            )}
            {booking.status === "ASSIGNED" && (
              <button
                type="button"
                onClick={() => onSetStatus("COMPLETED")}
                disabled={busy}
                className="rounded border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                Kamilisha
              </button>
            )}
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-4">
            <label htmlFor="source" className="text-xs font-medium text-zinc-600">
              Umetusikia wapi?
            </label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value as BookingSource | "")}
                className="rounded border border-zinc-300 px-2 py-2 text-sm"
              >
                <option value="">-- chagua chanzo --</option>
                {BOOKING_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {BOOKING_SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
              <input
                value={sourceDetail}
                onChange={(e) => setSourceDetail(e.target.value)}
                placeholder="mf. Aga Khan, Dkt. Mushi"
                aria-label="Maelezo ya chanzo"
                className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-2 text-sm"
              />
              <button
                type="button"
                onClick={saveSource}
                disabled={busy}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Hifadhi
              </button>
            </div>
          </div>
        </div>

        <div
          id="ufuatiliaji"
          className="rounded-xl border border-brand-blue/30 bg-white p-5 shadow-sm"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">Ufuatiliaji</h2>
            <span className="text-xs font-medium text-zinc-600">
              {followUpLabel(booking.next_follow_up_date, booking.status)}
            </span>
          </div>

          {booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Njia ya mawasiliano">
                {FOLLOW_UP_CHANNELS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFuChannel(c)}
                    aria-pressed={fuChannel === c}
                    className={`min-h-9 rounded-full border px-3 text-xs font-medium ${
                      fuChannel === c
                        ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                        : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {FOLLOW_UP_CHANNEL_LABELS[c]}
                  </button>
                ))}
              </div>
              <textarea
                value={fuNote}
                onChange={(e) => setFuNote(e.target.value)}
                rows={3}
                placeholder="Mmezungumza nini? mf. Ameomba bei ya ziara 3 kwa wiki, atajibu Ijumaa."
                aria-label="Kilichozungumzwa"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="fu-next" className="text-xs font-medium text-zinc-600">
                  Mfuatilie tena lini?
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="fu-next"
                    type="date"
                    value={fuNext}
                    onChange={(e) => setFuNext(e.target.value)}
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                  {QUICK_DATES.map((q) => (
                    <button
                      key={q.days}
                      type="button"
                      onClick={() => setFuNext(addDays(q.days))}
                      className="min-h-9 rounded border border-zinc-300 px-2 text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => saveFollowUp()}
                  disabled={busy || fuNote.trim().length < 2}
                  className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  Hifadhi ufuatiliaji
                </button>
                <button
                  type="button"
                  onClick={() => saveFollowUp("CANCELLED")}
                  disabled={busy || fuNote.trim().length < 2}
                  className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Hifadhi na funga (hajakubali)
                </button>
              </div>
              {fuMessage && (
                <p className="text-sm font-medium text-green-700" role="status">
                  {fuMessage}
                </p>
              )}
            </div>
          )}

          <ol className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4">
            {followUps.length === 0 ? (
              <li className="text-sm text-zinc-500">Bado hakuna mawasiliano yaliyorekodiwa.</li>
            ) : (
              followUps.map((f) => (
                <li key={f.id} className="text-sm">
                  <p className="text-xs text-zinc-500">
                    {new Date(f.created_at).toLocaleString("sw-TZ", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {FOLLOW_UP_CHANNEL_LABELS[f.channel as FollowUpChannel] ?? f.channel}
                    {f.created_by_name ? ` · ${f.created_by_name}` : ""}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line break-words text-zinc-900">{f.note}</p>
                  {f.next_follow_up_date && (
                    <p className="text-xs text-zinc-500">
                      Kufuatilia tena: {f.next_follow_up_date.slice(0, 10)}
                    </p>
                  )}
                </li>
              ))
            )}
          </ol>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              1. Pangia Staff
            </h2>
            <div className="flex gap-2">
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">-- chagua staff --</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAssignStaff}
                disabled={busy || !staffId}
                className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                Pangia
              </button>
            </div>
            {booking.staff_name && (
              <p className="mt-2 text-xs text-zinc-500">
                Amepangiwa: <span className="font-medium">{booking.staff_name}</span>
              </p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">
              2. Unganisha na Mgonjwa
            </h2>
            {booking.patient_id ? (
              <p className="text-sm">
                Ameunganishwa na:{" "}
                <Link
                  href={`/patients/${booking.patient_id}`}
                  className="font-medium text-brand-blue underline"
                >
                  {booking.patient_name}
                </Link>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <select
                    value={linkPatientId}
                    onChange={(e) => setLinkPatientId(e.target.value)}
                    className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">-- chagua mgonjwa aliyepo --</option>
                    {patientOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onLinkPatient}
                    disabled={busy || !linkPatientId}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Unganisha
                  </button>
                </div>
                <p className="text-center text-xs text-zinc-400">au</p>
                <button
                  type="button"
                  onClick={onConvertToPatient}
                  disabled={busy}
                  className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50"
                >
                  Tengeneza Mgonjwa Mpya kutoka Booking Hii
                </button>
              </div>
            )}
          </div>

          {booking.patient_id && booking.assigned_staff_id && (
            <div className="rounded-xl border border-brand-blue/30 bg-brand-blue-light/40 p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-zinc-900">
                3. Panga Ziara ya Kwanza
              </h2>
              <Link
                href={`/home-visits/new?patientId=${booking.patient_id}&staffId=${booking.assigned_staff_id}`}
                className="inline-block rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue-dark"
              >
                Rekodi Ziara
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
