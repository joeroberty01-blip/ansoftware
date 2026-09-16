"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  created_at: string;
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/bookings/${id}`);
    const json = await res.json();
    setBooking(json.booking ?? null);
    setStaffId(json.booking?.assigned_staff_id ?? "");
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

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Loading...</div>;
  }
  if (!booking) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
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
