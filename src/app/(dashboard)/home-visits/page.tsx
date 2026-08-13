"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Visit {
  id: string;
  patient_name: string;
  staff_name: string | null;
  visit_date: string;
  status: string;
  location: string | null;
  blood_pressure: string | null;
  treatment_notes: string | null;
}

const STATUS_OPTIONS = [
  { value: "", label: "Zote" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function HomeVisitsListPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const res = await fetch(`/api/home-visits?${params.toString()}`);
    const json = await res.json();
    setVisits(json.visits ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Home Visits</h1>
        <Link
          href="/home-visits/new"
          className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark"
        >
          Rekodi Ziara Mpya
        </Link>
      </div>

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

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : visits.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna home visits bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4">Mgonjwa</th>
                <th className="py-2 pr-4">Staff</th>
                <th className="py-2 pr-4">Location</th>
                <th className="py-2 pr-4">BP</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4">{v.visit_date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/home-visits/${v.id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {v.patient_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{v.staff_name ?? "-"}</td>
                  <td className="py-2 pr-4">{v.location ?? "-"}</td>
                  <td className="py-2 pr-4">{v.blood_pressure ?? "-"}</td>
                  <td className="py-2 pr-4">{v.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
