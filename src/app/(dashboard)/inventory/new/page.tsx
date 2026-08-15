"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewInventoryItemPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MEDICINE");
  const [unit, setUnit] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          unit,
          reorderLevel: Number(reorderLevel),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuongeza item.");
        return;
      }
      router.push(`/inventory/${json.item.id}`);
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Ongeza Item Mpya
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Jina la Item
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="mf. Paracetamol 500mg"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="MEDICINE">Medicine</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="CONSUMABLE">Consumable</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Unit (mf. vidonge, chupa, vipande)
          </label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Reorder Level
          </label>
          <input
            value={reorderLevel}
            onChange={(e) => setReorderLevel(e.target.value)}
            inputMode="numeric"
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
          className="mt-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {submitting ? "Inaongeza..." : "Ongeza Item"}
        </button>
      </form>
    </div>
  );
}
