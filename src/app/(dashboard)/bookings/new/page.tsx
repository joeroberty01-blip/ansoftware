"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BOOKING_SOURCES,
  BOOKING_SOURCE_LABELS,
  type BookingSource,
} from "@/lib/validation/bookings";

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function NewBookingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<BookingSource | "">("");
  const [sourceDetail, setSourceDetail] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState(todayLocal);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          serviceType,
          preferredDate: preferredDate || undefined,
          notes: notes || undefined,
          source: source || undefined,
          sourceDetail: sourceDetail || undefined,
          nextFollowUpDate: nextFollowUpDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not create the booking.");
        return;
      }
      router.push(`/bookings/${json.booking.id}`);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        New Booking
      </h1>

      <form
        onSubmit={onSubmit}
        className="flex max-w-lg flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Client's Full Name
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Mama Rehema"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Phone Number
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XXXXXXXX"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Service Requested
          </label>
          <input
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="e.g. Nursing Care 24hrs, Physiotherapy..."
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Preferred Date (optional)
          </label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="source" className="text-xs font-medium text-zinc-600">
            How did they hear about us?
          </label>
          <select
            id="source"
            value={source}
            onChange={(e) => setSource(e.target.value as BookingSource | "")}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">-- select source --</option>
            {BOOKING_SOURCES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
          <input
            value={sourceDetail}
            onChange={(e) => setSourceDetail(e.target.value)}
            placeholder="e.g. Aga Khan, Dr. Mushi, Facebook..."
            aria-label="Source details"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="next-follow-up" className="text-xs font-medium text-zinc-600">
            Follow-up date
          </label>
          <input
            id="next-follow-up"
            type="date"
            value={nextFollowUpDate}
            onChange={(e) => setNextFollowUpDate(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <p className="text-xs text-zinc-500">
            Usually today: call them within 2 hours.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Other Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !fullName || !phone || !serviceType}
          className="mt-2 self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {submitting ? "Inatengeneza..." : "Create Booking"}
        </button>
      </form>
    </div>
  );
}
