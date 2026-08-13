"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListToolbar } from "../_components/list-toolbar";

interface Item {
  id: string;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  current_stock: string;
  is_low_stock: boolean;
}

const CSV_COLUMNS = [
  { key: "name", label: "Jina" },
  { key: "category", label: "Category" },
  { key: "unit", label: "Unit" },
  { key: "current_stock", label: "Stock ya Sasa" },
  { key: "reorder_level", label: "Reorder Level" },
];

export default function InventoryListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/inventory/items");
    const json = await res.json();
    setItems(json.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lowStockCount = items.filter((i) => i.is_low_stock).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Inventory</h1>
        <div className="flex gap-2">
          <ListToolbar filename="inventory" columns={CSV_COLUMNS} rows={items} />
          <Link
            href="/inventory/alerts"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 print:hidden"
          >
            Alerts{lowStockCount > 0 ? ` (${lowStockCount})` : ""}
          </Link>
          <Link
            href="/inventory/new"
            className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark print:hidden"
          >
            Ongeza Item Mpya
          </Link>
        </div>
      </div>

      {lowStockCount > 0 && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
          Items {lowStockCount} ziko chini ya reorder level.{" "}
          <Link href="/inventory/alerts" className="underline">
            Ona alerts
          </Link>
        </p>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna items bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Jina</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4 text-right">Stock ya Sasa</th>
                <th className="py-2 pr-4 text-right">Reorder Level</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50 ${
                    item.is_low_stock ? "bg-amber-50" : ""
                  }`}
                >
                  <td className="py-2 pr-4">
                    <Link
                      href={`/inventory/${item.id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{item.category}</td>
                  <td className="py-2 pr-4">{item.unit}</td>
                  <td className="py-2 pr-4 text-right font-medium">
                    {item.current_stock}
                    {item.is_low_stock && (
                      <span className="ml-2 text-xs font-medium text-amber-700">
                        chini
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">{item.reorder_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
