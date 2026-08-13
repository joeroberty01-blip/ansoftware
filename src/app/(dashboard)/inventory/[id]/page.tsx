"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Item {
  id: string;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  current_stock: string;
  is_low_stock: boolean;
}

interface Movement {
  id: string;
  movement_type: "IN" | "OUT";
  quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export default function InventoryItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [item, setItem] = useState<Item | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const [movementType, setMovementType] = useState<"IN" | "OUT">("IN");
  const [quantity, setQuantity] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/inventory/items/${id}`);
    const json = await res.json();
    setItem(json.item ?? null);
    setMovements(json.movements ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/items/${id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movementType,
          quantity: Number(quantity),
          batchNumber: batchNumber || undefined,
          expiryDate: expiryDate || undefined,
          reference: reference || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kurekodi movement.");
        return;
      }
      setQuantity("");
      setBatchNumber("");
      setExpiryDate("");
      setReference("");
      await load();
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Inapakia...</div>;
  }
  if (!item) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{item.name}</h1>
        <p className="text-sm text-zinc-600">
          {item.category} — Unit: {item.unit}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-zinc-500">Stock ya Sasa</p>
            <p className="text-lg font-semibold text-zinc-900">
              {item.current_stock}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Reorder Level</p>
            <p className="font-medium">{item.reorder_level}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Status</p>
            <p
              className={`font-medium ${
                item.is_low_stock ? "text-amber-700" : "text-zinc-900"
              }`}
            >
              {item.is_low_stock ? "Stock Chini" : "Sawa"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Rekodi Movement (Stock In/Out)
        </h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={movementType === "IN"}
                onChange={() => setMovementType("IN")}
              />
              Stock IN (kuongeza)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={movementType === "OUT"}
                onChange={() => setMovementType("OUT")}
              />
              Stock OUT (kutoa)
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Idadi"
              inputMode="numeric"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            {movementType === "IN" && (
              <>
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="Batch Number (hiari)"
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  placeholder="Expiry Date"
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </>
            )}
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Reference (hiari)"
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
            disabled={submitting}
            className="self-start rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {submitting ? "Inarekodi..." : "Rekodi Movement"}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Historia ya Movements
        </h2>
        {movements.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna movements bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4">Aina</th>
                <th className="py-2 pr-4 text-right">Idadi</th>
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4">Expiry</th>
                <th className="py-2 pr-4">Reference</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-4">{m.created_at.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        m.movement_type === "IN"
                          ? "font-medium text-green-700"
                          : "font-medium text-red-700"
                      }
                    >
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right">{m.quantity}</td>
                  <td className="py-2 pr-4">{m.batch_number ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {m.expiry_date?.slice(0, 10) ?? "-"}
                  </td>
                  <td className="py-2 pr-4">{m.reference ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
