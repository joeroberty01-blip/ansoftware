"use client";

import { useEffect, useState } from "react";

interface Overview {
  days: number;
  patientsCount: number;
  newPatientsThisMonth: number;
  activePatientsCount: number;
  genderBreakdown: { gender: string | null; count: number }[];
  patientsPerNurse: { staffId: string; staffName: string; patientCount: number }[];
  visitStatusBreakdown: { status: string; count: number }[];
  staffLeaderboard: { staffId: string; staffName: string; completedCount: number }[];
  staffStatusCounts: {
    active: number;
    onLeave: number;
    inactive: number;
    terminated: number;
  };
  expiringLicenses: { staffId: string; staffName: string; expiryDate: string | null }[];
  lowStockItems: { id: string; name: string; unit: string; currentStock: string; reorderLevel: number }[];
  expiringBatches: {
    itemId: string;
    itemName: string;
    batchNumber: string | null;
    expiryDate: string;
    quantity: number;
  }[];
  income: string;
  expenses: string;
  netProfit: string;
}

const DAYS_OPTIONS = [
  { value: 7, label: "Wiki 1" },
  { value: 30, label: "Siku 30" },
  { value: 90, label: "Siku 90" },
];

function fmtMoney(value: string) {
  return new Intl.NumberFormat("en-TZ", { maximumFractionDigits: 0 }).format(
    Number(value)
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">{title}</h2>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/overview?days=${days}`)
      .then((r) => r.json())
      .then((json) => setData(json.overview ?? null))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-zinc-900">Reports</h1>
        <div className="flex items-center gap-2 print:hidden">
          <div className="flex overflow-hidden rounded-lg border border-zinc-300">
            {DAYS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  days === opt.value
                    ? "bg-brand-blue text-white"
                    : "bg-white text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Print
          </button>
        </div>
      </div>

      {loading || !data ? (
        <p className="text-sm text-zinc-500">Inapakia...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Wagonjwa Wote", value: data.patientsCount },
              { label: "Wapya Mwezi Huu", value: data.newPatientsThisMonth },
              { label: "Wagonjwa Active", value: data.activePatientsCount },
              { label: "Mapato (Mwezi)", value: `TZS ${fmtMoney(data.income)}` },
              { label: "Matumizi (Mwezi)", value: `TZS ${fmtMoney(data.expenses)}` },
              { label: "Net Profit (Mwezi)", value: `TZS ${fmtMoney(data.netProfit)}` },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <p className="text-xs text-zinc-500">{card.label}</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Wagonjwa kwa Jinsia (Gender)">
              {data.genderBreakdown.length === 0 ? (
                <p className="text-sm text-zinc-500">Hakuna data.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {data.genderBreakdown.map((g) => (
                      <tr key={g.gender ?? "unknown"} className="border-b border-zinc-100 last:border-0">
                        <td className="py-1.5">{g.gender ?? "Haijawekwa"}</td>
                        <td className="py-1.5 text-right font-medium">{g.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title="Staff Status">
              <table className="w-full text-left text-sm">
                <tbody>
                  <tr className="border-b border-zinc-100">
                    <td className="py-1.5">Active</td>
                    <td className="py-1.5 text-right font-medium">
                      {data.staffStatusCounts.active}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100">
                    <td className="py-1.5">Likizoni (On Leave)</td>
                    <td className="py-1.5 text-right font-medium">
                      {data.staffStatusCounts.onLeave}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-100">
                    <td className="py-1.5">Inactive</td>
                    <td className="py-1.5 text-right font-medium">
                      {data.staffStatusCounts.inactive}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5">Terminated</td>
                    <td className="py-1.5 text-right font-medium">
                      {data.staffStatusCounts.terminated}
                    </td>
                  </tr>
                </tbody>
              </table>
            </SectionCard>
          </div>

          <SectionCard title="Wagonjwa kwa Nurse (Patient Load per Nurse)">
            {data.patientsPerNurse.length === 0 ? (
              <p className="text-sm text-zinc-500">Hakuna staff active.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                    <th className="py-2 pr-4">Nurse</th>
                    <th className="py-2 pr-4 text-right">Idadi ya Wagonjwa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.patientsPerNurse.map((n) => (
                    <tr key={n.staffId} className="border-b border-zinc-100 last:border-0">
                      <td className="py-1.5 pr-4">{n.staffName}</td>
                      <td className="py-1.5 pr-4 text-right font-medium">
                        {n.patientCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title={`Home Visits (Siku ${data.days} Zilizopita)`}>
              {data.visitStatusBreakdown.length === 0 ? (
                <p className="text-sm text-zinc-500">Hakuna ziara katika kipindi hiki.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {data.visitStatusBreakdown.map((v) => (
                      <tr key={v.status} className="border-b border-zinc-100 last:border-0">
                        <td className="py-1.5">{v.status}</td>
                        <td className="py-1.5 text-right font-medium">{v.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title={`Staff Leaderboard (Ziara Zilizokamilika, Siku ${data.days})`}>
              {data.staffLeaderboard.length === 0 ? (
                <p className="text-sm text-zinc-500">Hakuna data kwa kipindi hiki.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                      <th className="py-2 pr-4">Nurse</th>
                      <th className="py-2 pr-4 text-right">Ziara Zilizokamilika</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.staffLeaderboard.map((s) => (
                      <tr key={s.staffId} className="border-b border-zinc-100 last:border-0">
                        <td className="py-1.5 pr-4">{s.staffName}</td>
                        <td className="py-1.5 pr-4 text-right font-medium">
                          {s.completedCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </div>

          <SectionCard title="Leseni Zinazokaribia Kuisha (siku 90)">
            {data.expiringLicenses.length === 0 ? (
              <p className="text-sm text-zinc-500">Hakuna leseni zinazokaribia kuisha.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                    <th className="py-2 pr-4">Nurse</th>
                    <th className="py-2 pr-4">Leseni Inaisha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.expiringLicenses.map((l) => (
                    <tr key={l.staffId} className="border-b border-zinc-100 last:border-0">
                      <td className="py-1.5 pr-4">{l.staffName}</td>
                      <td className="py-1.5 pr-4">
                        {l.expiryDate ? l.expiryDate.slice(0, 10) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard title="Stock Chini ya Reorder Level">
              {data.lowStockItems.length === 0 ? (
                <p className="text-sm text-zinc-500">Hakuna item chini ya reorder level.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                      <th className="py-2 pr-4">Item</th>
                      <th className="py-2 pr-4 text-right">Stock</th>
                      <th className="py-2 pr-4 text-right">Reorder Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStockItems.map((i) => (
                      <tr key={i.id} className="border-b border-zinc-100 last:border-0">
                        <td className="py-1.5 pr-4">{i.name}</td>
                        <td className="py-1.5 pr-4 text-right">
                          {i.currentStock} {i.unit}
                        </td>
                        <td className="py-1.5 pr-4 text-right">{i.reorderLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title="Batches Zinazokaribia Kuisha (siku 90)">
              {data.expiringBatches.length === 0 ? (
                <p className="text-sm text-zinc-500">Hakuna batch zinazokaribia kuisha.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                      <th className="py-2 pr-4">Item</th>
                      <th className="py-2 pr-4">Batch</th>
                      <th className="py-2 pr-4">Inaisha</th>
                      <th className="py-2 pr-4 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expiringBatches.map((b, idx) => (
                      <tr
                        key={`${b.itemId}-${idx}`}
                        className="border-b border-zinc-100 last:border-0"
                      >
                        <td className="py-1.5 pr-4">{b.itemName}</td>
                        <td className="py-1.5 pr-4">{b.batchNumber ?? "-"}</td>
                        <td className="py-1.5 pr-4">{b.expiryDate.slice(0, 10)}</td>
                        <td className="py-1.5 pr-4 text-right">{b.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
