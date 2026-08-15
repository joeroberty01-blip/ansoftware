"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface LowStockItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  current_stock: string;
}

interface ExpiringBatch {
  id: string;
  item_id: string;
  item_name: string;
  batch_number: string | null;
  expiry_date: string;
  quantity: number;
}

export default function InventoryAlertsPage() {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiringBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inventory/alerts?withinDays=60");
    const json = await res.json();
    setLowStock(json.lowStock ?? []);
    setExpiring(json.expiring ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Inventory Alerts
        </h1>
        <Link
          href="/inventory"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
        >
          Rudi kwenye Inventory
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Low Stock ({lowStock.length})
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : lowStock.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna items chini ya reorder level.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Jina</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Stock ya Sasa</th>
                <th className="py-2 pr-4 text-right">Reorder Level</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 bg-amber-50 last:border-0">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{item.category}</td>
                  <td className="py-2 pr-4 text-right font-medium text-amber-700">
                    {item.current_stock}
                  </td>
                  <td className="py-2 pr-4 text-right">{item.reorder_level}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Zinazokaribia Kuisha (siku 60) ({expiring.length})
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : expiring.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna batch zinazokaribia kuisha.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4 text-right">Idadi</th>
                <th className="py-2 pr-4">Inaisha</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map((b) => (
                <tr key={b.id} className="border-b border-zinc-100 bg-red-50 last:border-0">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/inventory/${b.item_id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {b.item_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{b.batch_number ?? "-"}</td>
                  <td className="py-2 pr-4 text-right">{b.quantity}</td>
                  <td className="py-2 pr-4 font-medium text-red-700">
                    {b.expiry_date.slice(0, 10)}
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
