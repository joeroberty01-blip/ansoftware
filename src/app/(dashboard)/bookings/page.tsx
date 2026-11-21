"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";
import { BOOKING_SOURCE_LABELS, type BookingSource } from "@/lib/validation/bookings";

const CSV_COLUMNS = [
  { key: "created_at", label: "Date" },
  { key: "full_name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "service_type", label: "Service" },
  { key: "source", label: "Source" },
  { key: "source_detail", label: "Source details" },
  { key: "next_follow_up_date", label: "Follow up" },
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
  source: string | null;
  source_detail: string | null;
  next_follow_up_date: string | null;
  staff_name: string | null;
  patient_name: string | null;
  created_at: string;
}

interface Stats {
  dueToday: number;
  overdue: number;
  thisMonth: number;
  convertedThisMonth: number;
  bySource: { source: string | null; total: number; converted: number }[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "NEW", label: "New" },
  { value: "ASSIGNED", label: "Imepangiwa" },
  { value: "COMPLETED", label: "Imekamilika" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_BADGES: Record<string, string> = {
  NEW: "bg-orange-100 text-orange-700",
  ASSIGNED: "bg-brand-blue-light text-brand-blue",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function sourceLabel(source: string | null) {
  return source ? (BOOKING_SOURCE_LABELS[source as BookingSource] ?? source) : "Haijulikani";
}

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function FollowUpCell({ date, status }: { date: string | null; status: string }) {
  if (!date || status === "COMPLETED" || status === "CANCELLED") return <>-</>;
  const day = date.slice(0, 10);
  const today = todayLocal();
  if (day < today) {
    return <span className="font-semibold text-red-700">{day} (overdue)</span>;
  }
  if (day === today) {
    return <span className="font-semibold text-orange-700">Today</span>;
  }
  return <>{day}</>;
}

export default function BookingsListPage(props: PageProps<"/bookings">) {
  // The morning notification opens /bookings?due=1.
  const initialDue = use(props.searchParams).due === "1";
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState("");
  const [dueOnly, setDueOnly] = useState(initialDue);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (dueOnly) params.set("due", "1");
    const res = await fetch(`/api/bookings?${params.toString()}`);
    const json = await res.json();
    setBookings(json.bookings ?? []);
    setStats(json.stats ?? null);
    setLoading(false);
  }, [status, dueOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDue = (value: boolean) => {
    setDueOnly(value);
    window.history.replaceState(null, "", value ? "/bookings?due=1" : "/bookings");
  };

  const dueTotal = stats ? stats.dueToday + stats.overdue : 0;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Bookings</h1>
          <p className="text-sm text-zinc-500">
            Service requests: follow up each one until it becomes a patient or is closed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ListToolbar filename="bookings" columns={CSV_COLUMNS} rows={bookings} />
          <Link
            href="/bookings/new"
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark print:hidden"
          >
            New Booking
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
          <button
            type="button"
            onClick={() => toggleDue(true)}
            className={`rounded-xl border p-4 text-left shadow-sm transition-colors ${
              dueTotal > 0
                ? "border-orange-300 bg-orange-50 hover:bg-orange-100"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
            }`}
          >
            <p className="text-xs font-medium text-zinc-600">Due for follow-up today</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{dueTotal}</p>
            {stats.overdue > 0 && (
              <p className="text-xs font-semibold text-red-700">{stats.overdue} overdue</p>
            )}
          </button>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-zinc-600">Requests this month</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{stats.thisMonth}</p>
            <p className="text-xs text-zinc-500">Target: 17</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-zinc-600">Became patients</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{stats.convertedThisMonth}</p>
            <p className="text-xs text-zinc-500">this month</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-zinc-600">Wanaokubali</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {stats.thisMonth > 0
                ? `${Math.round((stats.convertedThisMonth / stats.thisMonth) * 100)}%`
                : "-"}
            </p>
            <p className="text-xs text-zinc-500">Target: 30%</p>
          </div>
        </div>
      )}

      {stats && stats.bySource.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm print:hidden">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Where requests come from (this month)
          </h2>
          <table className="w-full text-left text-sm" data-keep-table>
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4 text-right">Requests</th>
                <th className="py-2 text-right">Patients</th>
              </tr>
            </thead>
            <tbody>
              {stats.bySource.map((r) => (
                <tr key={r.source ?? "none"} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-4">{sourceLabel(r.source)}</td>
                  <td className="py-2 pr-4 text-right">{r.total}</td>
                  <td className="py-2 text-right">{r.converted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center print:hidden">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
          className="w-full rounded border border-zinc-300 px-2 py-2 text-sm sm:max-w-xs"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => toggleDue(e.target.checked)}
            className="h-4 w-4"
          />
          Due for follow-up today only
        </label>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {dueOnly ? "No requests to follow up today." : "No bookings yet."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Service</th>
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Follow up</th>
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
                    <td className="py-2 pr-4">{sourceLabel(b.source)}</td>
                    <td className="py-2 pr-4">
                      <FollowUpCell date={b.next_follow_up_date} status={b.status} />
                    </td>
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
