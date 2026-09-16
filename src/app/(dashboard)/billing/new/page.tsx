"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type DocType = "QUOTATION" | "PROFORMA" | "INVOICE" | "TAX_INVOICE";

const DOC_TYPE_OPTIONS: { value: DocType; label: string }[] = [
  { value: "QUOTATION", label: "Quotation" },
  { value: "PROFORMA", label: "Proforma Invoice" },
  { value: "INVOICE", label: "Invoice" },
  { value: "TAX_INVOICE", label: "Tax Invoice" },
];

function initialDocType(param: string | null): DocType {
  return (DOC_TYPE_OPTIONS as readonly { value: string; label: string }[]).some(
    (o) => o.value === param
  )
    ? (param as DocType)
    : "QUOTATION";
}

const CLIENT_TYPE_OPTIONS = [
  { value: "INDIVIDUAL", label: "Mtu Binafsi" },
  { value: "CORPORATE", label: "Kampuni" },
  { value: "INSURANCE", label: "Bima" },
];

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

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";
const labelClass = "text-xs font-medium text-zinc-600";
const sectionTitleClass = "text-sm font-semibold text-zinc-900";

export default function NewBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [docType, setDocType] = useState<DocType>(() =>
    initialDocType(searchParams.get("docType"))
  );
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientType, setNewClientType] = useState("INDIVIDUAL");
  const [newClientAddress, setNewClientAddress] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyItem(), emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (!newClientName.trim() || !newClientPhone.trim()) {
      setError("Jina na simu ya client vinahitajika.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          documentNumber: documentNumber.trim() || undefined,
          issueDate: issueDate || undefined,
          newClient: {
            name: newClientName,
            phone: newClientPhone,
            email: newClientEmail || undefined,
            type: newClientType,
            address: newClientAddress || undefined,
          },
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
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Tengeneza Quotation/Invoice
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Jaza taarifa za hati, client na items, kisha ubofye Tengeneza.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        {/* Aina ya Hati */}
        <div className="flex flex-col gap-2">
          <label className={labelClass}>Aina ya Hati</label>
          <div className="flex flex-wrap gap-1 self-start rounded-lg bg-zinc-100 p-1">
            {DOC_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDocType(opt.value)}
                className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  docType === opt.value
                    ? "bg-white text-brand-blue shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100" />

        {/* Taarifa za Hati */}
        <div className="flex flex-col gap-3">
          <h2 className={sectionTitleClass}>Taarifa za Hati</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>
                Namba ya Hati <span className="text-zinc-400">(hiari)</span>
              </label>
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Kiotomatiki ikiwa wazi"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>
                Tarehe ya Kutolewa <span className="text-zinc-400">(hiari)</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>
                Due Date <span className="text-zinc-400">(hiari)</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100" />

        {/* Taarifa za Client */}
        <div className="flex flex-col gap-3">
          <h2 className={sectionTitleClass}>Taarifa za Client</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Jina la Client</label>
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="mf. Mama Amina"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Simu</label>
              <input
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>
                Barua Pepe <span className="text-zinc-400">(hiari)</span>
              </label>
              <input
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="mf. amina@mail.com"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Aina</label>
              <select
                value={newClientType}
                onChange={(e) => setNewClientType(e.target.value)}
                className={inputClass}
              >
                {CLIENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className={labelClass}>
                Anwani <span className="text-zinc-400">(hiari)</span>
              </label>
              <input
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                placeholder="mf. Mikocheni, Dar es Salaam"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100" />

        {/* Items */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className={sectionTitleClass}>Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-semibold text-brand-blue hover:underline"
            >
              + Ongeza Item
            </button>
          </div>

          <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-400 sm:grid">
            <span className="col-span-6">Maelezo</span>
            <span className="col-span-2">Idadi</span>
            <span className="col-span-2">Bei</span>
            <span className="col-span-2">Jumla</span>
          </div>

          <div className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-12 items-center gap-2 rounded-lg bg-zinc-50 p-2 sm:bg-transparent sm:p-0"
              >
                <input
                  value={item.description}
                  onChange={(e) =>
                    updateItem(i, { description: e.target.value })
                  }
                  placeholder="Maelezo ya huduma"
                  className={`col-span-12 sm:col-span-6 ${inputClass}`}
                />
                <input
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, { quantity: e.target.value })
                  }
                  placeholder="Idadi"
                  inputMode="decimal"
                  className={`col-span-4 sm:col-span-2 ${inputClass}`}
                />
                <input
                  value={item.unitPrice}
                  onChange={(e) =>
                    updateItem(i, { unitPrice: e.target.value })
                  }
                  placeholder="Bei"
                  inputMode="decimal"
                  className={`col-span-4 sm:col-span-2 ${inputClass}`}
                />
                <div className="col-span-3 flex items-center justify-end text-sm font-medium text-zinc-700 sm:col-span-1 sm:justify-start">
                  {fmt(lineTotal(item))}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length <= 1}
                  className="col-span-1 justify-self-end text-xs font-medium text-red-600 hover:underline disabled:opacity-30"
                >
                  Ondoa
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100" />

        {/* Maelezo + Jumla */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>
              Maelezo ya Ziada <span className="text-zinc-400">(hiari)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              rows={2}
            />
          </div>

          <div className="flex items-center justify-end gap-2 rounded-lg bg-brand-blue-light/40 px-4 py-2.5">
            <span className="text-sm text-zinc-600">Jumla (makadirio)</span>
            <span className="text-base font-bold text-zinc-900">
              TZS {fmt(subtotalPreview)}
            </span>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {submitting ? "Inatengeneza..." : "Tengeneza"}
        </button>
      </form>
    </div>
  );
}
