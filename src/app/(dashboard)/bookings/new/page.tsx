"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewBookingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
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
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kutengeneza booking.");
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
        Booking Mpya
      </h1>

      <form
        onSubmit={onSubmit}
        className="flex max-w-lg flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Jina Kamili la Mteja
          </label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="mf. Mama Rehema"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Namba ya Simu
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
            Aina ya Huduma Inayoombwa
          </label>
          <input
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="mf. Nursing Care 24hrs, Physiotherapy..."
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Tarehe Anayopendelea (hiari)
          </label>
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Maelezo Mengine (hiari)
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
          {submitting ? "Inatengeneza..." : "Tengeneza Booking"}
        </button>
      </form>
    </div>
  );
}
