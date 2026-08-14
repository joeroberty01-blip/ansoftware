"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";

const CSV_COLUMNS = [
  { key: "visit_date", label: "Tarehe" },
  { key: "patient_name", label: "Mgonjwa" },
  { key: "staff_name", label: "Staff" },
  { key: "location", label: "Location" },
  { key: "blood_pressure", label: "BP" },
  { key: "status", label: "Status" },
];

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
  const router = useRouter();
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

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (v: Visit) => {
    if (
      !window.confirm(`Futa home visit ya ${v.patient_name} (${v.visit_date.slice(0, 10)})?`)
    ) {
      return;
    }
    setDeletingId(v.id);
    try {
      const res = await fetch(`/api/home-visits/${v.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "Imeshindwa kufuta.");
        return;
      }
      await load();
    } catch {
      alert("Hitilafu ya mtandao.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Home Visits</h1>
        <div className="flex gap-2">
          <ListToolbar
            filename="home-visits"
            columns={CSV_COLUMNS}
            rows={visits}
          />
          <Link
            href="/home-visits/new"
            className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark print:hidden"
          >
            Rekodi Ziara Mpya
          </Link>
        </div>
      </div>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full max-w-xs rounded border border-zinc-300 px-2 py-1.5 text-sm print:hidden"
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
                <th className="py-2 pr-4 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`/home-visits/${v.id}`)}
                  className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4">{v.visit_date.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/home-visits/${v.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-zinc-900 underline"
                    >
                      {v.patient_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{v.staff_name ?? "-"}</td>
                  <td className="py-2 pr-4">{v.location ?? "-"}</td>
                  <td className="py-2 pr-4">{v.blood_pressure ?? "-"}</td>
                  <td className="py-2 pr-4">{v.status}</td>
                  <td className="py-2 pr-4 text-right print:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(v);
                      }}
                      disabled={deletingId === v.id}
                      className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                    >
                      Futa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
