"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface PendingStaff {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

export default function PendingStaffPage() {
  const [pending, setPending] = useState<PendingStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/staff/approvals");
    const json = await res.json();
    setPending(json.staff ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDecide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    setDecidingId(id);
    try {
      const res = await fetch(`/api/staff/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuamua.");
        return;
      }
      await load();
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Staff Wanaosubiri Idhini
        </h1>
        <Link
          href="/staff"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
        >
          Rudi kwenye Staff
        </Link>
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Hakuna staff wanaosubiri idhini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Jina</th>
                <th className="py-2 pr-4">Barua pepe</th>
                <th className="py-2 pr-4">Simu</th>
                <th className="py-2 pr-4">Aliomba</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-4">{p.fullName}</td>
                  <td className="py-2 pr-4">{p.email}</td>
                  <td className="py-2 pr-4">{p.phone ?? "-"}</td>
                  <td className="py-2 pr-4">{p.createdAt.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDecide(p.id, "APPROVED")}
                        disabled={decidingId === p.id}
                        className="rounded bg-brand-blue px-3 py-1 text-xs font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
                      >
                        Idhinisha
                      </button>
                      <button
                        onClick={() => onDecide(p.id, "REJECTED")}
                        disabled={decidingId === p.id}
                        className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                      >
                        Kataa
                      </button>
                    </div>
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
