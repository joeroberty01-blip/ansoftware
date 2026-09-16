"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";

const CSV_COLUMNS = [
  { key: "created_at", label: "Tarehe" },
  { key: "full_name", label: "Jina" },
  { key: "phone", label: "Simu" },
  { key: "service_type", label: "Huduma" },
  { key: "preferred_date", label: "Tarehe Anayopendelea" },
  { key: "staff_name", label: "Staff" },
  { key: "status", label: "Status" },
];

interface Booking {
  id: string;
  full_name: string;
  phone: string;
  service_type: string;
  preferred_date: string | null;
  status: string;
  staff_name: string | null;
  patient_name: string | null;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Zote" },
  { value: "NEW", label: "Mpya" },
  { value: "ASSIGNED", label: "Imepangiwa" },
  { value: "COMPLETED", label: "Imekamilika" },
  { value: "CANCELLED", label: "Imeghairiwa" },
];

const STATUS_BADGES: Record<string, string> = {
  NEW: "bg-orange-100 text-orange-700",
  ASSIGNED: "bg-brand-blue-light text-brand-blue",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function BookingsListPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/bookings?${params.toString()}`);
    const json = await res.json();
    setBookings(json.bookings ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Bookings</h1>
          <p className="text-sm text-zinc-500">
            Maombi ya huduma yanayoingia — pangia staff na uyageuze kuwa wagonjwa.
          </p>
        </div>
        <div className="flex gap-2">
          <ListToolbar filename="bookings" columns={CSV_COLUMNS} rows={bookings} />
          <Link
            href="/bookings/new"
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark print:hidden"
          >
            Booking Mpya
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full max-w-xs rounded border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna bookings bado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Tarehe</th>
                  <th className="py-2 pr-4">Jina</th>
                  <th className="py-2 pr-4">Simu</th>
                  <th className="py-2 pr-4">Huduma</th>
                  <th className="py-2 pr-4">Anapendelea</th>
                  <th className="py-2 pr-4">Staff</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => router.push(`/bookings/${b.id}`)}
                    className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="py-2 pr-4">{b.created_at.slice(0, 10)}</td>
                    <td className="py-2 pr-4 font-medium text-zinc-900">{b.full_name}</td>
                    <td className="py-2 pr-4">{b.phone}</td>
                    <td className="py-2 pr-4">{b.service_type}</td>
                    <td className="py-2 pr-4">
                      {b.preferred_date ? b.preferred_date.slice(0, 10) : "-"}
                    </td>
                    <td className="py-2 pr-4">{b.staff_name ?? "-"}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          STATUS_BADGES[b.status] ?? "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {b.status}
                      </span>
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
