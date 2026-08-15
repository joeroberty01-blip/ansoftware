"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type DocType = "QUOTATION" | "PROFORMA" | "INVOICE" | "TAX_INVOICE";

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "QUOTATION", label: "Quotation" },
  { value: "PROFORMA", label: "Proforma Invoice" },
  { value: "INVOICE", label: "Invoice" },
  { value: "TAX_INVOICE", label: "Tax Invoice" },
];

interface Client {
  id: string;
  name: string;
}

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

function emptyItem(): ItemRow {
  return { description: "", quantity: "1", unitPrice: "" };
}

// Preview only — the server recomputes every total with Decimal.js and
// never trusts this number.
function lineTotal(item: ItemRow) {
  const q = Number(item.quantity);
  const p = Number(item.unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p)) return 0;
  return q * p;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function NewBillingPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [docType, setDocType] = useState<DocType>("QUOTATION");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem(), emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((json: { clients?: Client[] }) => {
        const list = json.clients ?? [];
        setClients(list);
        if (list[0]) setClientId((prev) => prev || list[0].id);
      });
  }, []);

  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const subtotalPreview = items.reduce((sum, it) => sum + lineTotal(it), 0);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!clientId) {
      setError("Chagua client.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          clientId,
          dueDate: dueDate || undefined,
          notes: notes || undefined,
          items: items
            .filter((it) => it.description.trim())
            .map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kutengeneza.");
        return;
      }
      router.push(`/billing/${json.invoice.id}`);
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Tengeneza Quotation/Invoice
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          {DOC_TYPE_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={docType === opt.value}
                onChange={() => setDocType(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">-- chagua client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Due Date (hiari)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-600">
              Items
            </label>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-zinc-900 underline"
            >
              + Ongeza Item
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(i, { description: e.target.value })
                  }
                  placeholder="Maelezo"
                  className="col-span-6 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, { quantity: e.target.value })
                  }
                  placeholder="Idadi"
                  inputMode="decimal"
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(i, { unitPrice: e.target.value })
                  }
                  placeholder="Bei"
                  inputMode="decimal"
                  className="col-span-2 rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
                <div className="col-span-1 flex items-center text-sm text-zinc-700">
                  {fmt(lineTotal(item))}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length <= 1}
                  className="col-span-1 text-xs text-red-600 disabled:opacity-30"
                >
                  Ondoa
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Maelezo ya Ziada (hiari)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            rows={2}
          />
        </div>

        <div className="flex justify-end text-sm font-semibold text-zinc-900">
          Jumla (makadirio): {fmt(subtotalPreview)}
        </div>

        {error && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {submitting ? "Inatengeneza..." : "Tengeneza"}
        </button>
      </form>
    </div>
  );
}
