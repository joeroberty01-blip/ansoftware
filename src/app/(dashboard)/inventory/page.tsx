"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (item: Item) => {
    if (!window.confirm(`Futa item "${item.name}" KABISA?`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/inventory/items/${item.id}`, {
        method: "DELETE",
      });
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
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Inventory</h1>
        <div className="flex gap-2">
          <ListToolbar filename="inventory" columns={CSV_COLUMNS} rows={items} />
          <Link
            href="/inventory/alerts"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 print:hidden"
          >
            Alerts{lowStockCount > 0 ? ` (${lowStockCount})` : ""}
          </Link>
          <Link
            href="/inventory/new"
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark print:hidden"
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

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna items bado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Jina</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4 text-right">Stock ya Sasa</th>
                <th className="py-2 pr-4 text-right">Reorder Level</th>
                <th className="py-2 pr-4 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/inventory/${item.id}`)}
                  className={`cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 ${
                    item.is_low_stock ? "bg-amber-50" : ""
                  }`}
                >
                  <td className="py-2 pr-4">
                    <Link
                      href={`/inventory/${item.id}`}
                      onClick={(e) => e.stopPropagation()}
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
                  <td className="py-2 pr-4 text-right print:hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                      }}
                      disabled={deletingId === item.id}
                      className="text-xs font-medium text-red-700 underline disabled:opacity-50"
                    >
                      Futa
                    </button>
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
