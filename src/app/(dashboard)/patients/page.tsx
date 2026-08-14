"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";

const CSV_COLUMNS = [
  { key: "full_name", label: "Jina" },
  { key: "date_of_birth", label: "Tarehe ya Kuzaliwa" },
  { key: "gender", label: "Jinsia" },
  { key: "phone", label: "Simu" },
  { key: "blood_type", label: "Blood Type" },
  { key: "chronic_conditions", label: "Chronic Conditions" },
];

interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  blood_type: string | null;
  chronic_conditions: string | null;
}

export default function PatientsListPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    const res = await fetch(`/api/patients?${params.toString()}`);
    const json = await res.json();
    setPatients(json.patients ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (p: Patient) => {
    if (
      !window.confirm(
        `Futa mgonjwa "${p.full_name}" KABISA? Hii itafuta pia dawa, documents, na home visits zake zote.`
      )
    ) {
      return;
    }
    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/patients/${p.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "Imeshindwa kufuta.");
        return;
      }
      await load(search);
    } catch {
      alert("Hitilafu ya mtandao.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Patients</h1>
        <div className="flex gap-2">
          <ListToolbar
            filename="patients"
            columns={CSV_COLUMNS}
            rows={patients}
          />
          <Link
            href="/patients/new"
            className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark print:hidden"
          >
            Ongeza Mgonjwa Mpya
          </Link>
        </div>
      </div>

      <form onSubmit={onSearchSubmit} className="flex gap-2 print:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tafuta kwa jina..."
          className="w-full max-w-sm rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Tafuta
        </button>
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : patients.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna wagonjwa bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Jina</th>
                <th className="py-2 pr-4">Tarehe ya Kuzaliwa</th>
                <th className="py-2 pr-4">Jinsia</th>
                <th className="py-2 pr-4">Simu</th>
                <th className="py-2 pr-4">Blood Type</th>
                <th className="py-2 pr-4">Chronic Conditions</th>
                <th className="py-2 pr-4 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/patients/${p.id}`)}
                  className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4">
                    <Link
                      href={`/patients/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-zinc-900 underline"
                    >
                      {p.full_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">
                    {p.date_of_birth?.slice(0, 10) ?? "-"}
                  </td>
                  <td className="py-2 pr-4">{p.gender ?? "-"}</td>
                  <td className="py-2 pr-4">{p.phone ?? "-"}</td>
                  <td className="py-2 pr-4">{p.blood_type ?? "-"}</td>
                  <td className="py-2 pr-4">{p.chronic_conditions ?? "-"}</td>
                  <td className="py-2 pr-4 text-right print:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(p);
                      }}
                      disabled={deletingId === p.id}
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
