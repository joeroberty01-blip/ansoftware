"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListToolbar } from "../_components/list-toolbar";

interface Payment {
  id: string;
  invoice_id: string;
  amount: string;
  method: string;
  reference: string | null;
  paid_at: string;
  document_number: string;
  doc_type: string;
  client_name: string;
  received_by_name: string;
}

interface ManualReceipt {
  id: string;
  receipt_number: string;
  client_name: string;
  phone: string | null;
  amount: string;
  method: string;
  reference: string | null;
  description: string | null;
  issued_at: string;
  issued_by_name: string;
}

const CSV_COLUMNS = [
  { key: "paid_at", label: "Tarehe" },
  { key: "document_number", label: "Hati" },
  { key: "client_name", label: "Client" },
  { key: "amount", label: "Kiasi" },
  { key: "method", label: "Njia" },
  { key: "reference", label: "Kumbukumbu" },
  { key: "received_by_name", label: "Aliyepokea" },
];

const MANUAL_CSV_COLUMNS = [
  { key: "issued_at", label: "Tarehe" },
  { key: "receipt_number", label: "Namba" },
  { key: "client_name", label: "Client" },
  { key: "amount", label: "Kiasi" },
  { key: "method", label: "Njia" },
  { key: "reference", label: "Kumbukumbu" },
  { key: "issued_by_name", label: "Aliyetoa" },
];

const PAYMENT_METHODS = [
  "CASH",
  "MPESA",
  "AIRTEL_MONEY",
  "MIXX_BY_YAS",
  "BANK_TRANSFER",
];

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("");

  const [manualReceipts, setManualReceipts] = useState<ManualReceipt[]>([]);
  const [manualLoading, setManualLoading] = useState(true);
  const [showManualForm, setShowManualForm] = useState(false);
  const [mrReceiptNumber, setMrReceiptNumber] = useState("");
  const [mrIssuedAt, setMrIssuedAt] = useState("");
  const [mrClientName, setMrClientName] = useState("");
  const [mrPhone, setMrPhone] = useState("");
  const [mrAmount, setMrAmount] = useState("");
  const [mrMethod, setMrMethod] = useState("CASH");
  const [mrReference, setMrReference] = useState("");
  const [mrDescription, setMrDescription] = useState("");
  const [mrError, setMrError] = useState<string | null>(null);
  const [mrSubmitting, setMrSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const json = await res.json();
    setPayments(json.payments ?? []);
    setLoading(false);
  }, []);

  const loadManual = useCallback(async () => {
    setManualLoading(true);
    const res = await fetch("/api/manual-receipts");
    const json = await res.json();
    setManualReceipts(json.receipts ?? []);
    setManualLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadManual();
  }, [load, loadManual]);

  const filtered = methodFilter
    ? payments.filter((p) => p.method === methodFilter)
    : payments;

  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amount), 0);
  const methods = Array.from(new Set(payments.map((p) => p.method)));

  const resetManualForm = () => {
    setMrReceiptNumber("");
    setMrIssuedAt("");
    setMrClientName("");
    setMrPhone("");
    setMrAmount("");
    setMrMethod("CASH");
    setMrReference("");
    setMrDescription("");
    setMrError(null);
  };

  const onAddManualReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setMrError(null);
    if (!mrClientName.trim()) {
      setMrError("Jina la client linahitajika.");
      return;
    }
    setMrSubmitting(true);
    try {
      const res = await fetch("/api/manual-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptNumber: mrReceiptNumber.trim() || undefined,
          issuedAt: mrIssuedAt || undefined,
          clientName: mrClientName,
          phone: mrPhone || undefined,
          amount: mrAmount,
          method: mrMethod,
          reference: mrReference || undefined,
          description: mrDescription || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMrError(json.error ?? "Imeshindwa kutengeneza risiti.");
        return;
      }
      resetManualForm();
      setShowManualForm(false);
      await loadManual();
      window.open(
        `/print/receipts/manual/${json.receipt.id}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch {
      setMrError("Network error.");
    } finally {
      setMrSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Receipts</h1>
        <div className="flex items-center gap-2 print:hidden">
          <ListToolbar filename="receipts" columns={CSV_COLUMNS} rows={filtered} />
          <button
            type="button"
            onClick={() => setShowManualForm((v) => !v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
              showManualForm
                ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                : "bg-brand-blue text-white hover:bg-brand-blue-dark"
            }`}
          >
            {showManualForm ? "Funga" : "Ongeza Risiti"}
          </button>
        </div>
      </div>

      {showManualForm && (
        <form
          onSubmit={onAddManualReceipt}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm print:hidden"
        >
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Risiti Papo kwa Papo
            </h2>
            <p className="text-xs text-zinc-500">
              Kwa malipo yasiyotoka kwenye Invoice (mf. huduma ndogo ya haraka).
              Risiti hizi <span className="font-semibold">hazihesabiwi</span>{" "}
              kwenye Mapato/Finance — ni kumbukumbu ya kuchapisha tu.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Namba ya Risiti (hiari — kama huachwi wazi, itatengenezwa kiotomatiki)
              </label>
              <input
                value={mrReceiptNumber}
                onChange={(e) => setMrReceiptNumber(e.target.value)}
                placeholder="mf. RCT-00014"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Tarehe (hiari — leo ndiyo default)
              </label>
              <input
                type="date"
                value={mrIssuedAt}
                onChange={(e) => setMrIssuedAt(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Jina la Client
              </label>
              <input
                value={mrClientName}
                onChange={(e) => setMrClientName(e.target.value)}
                placeholder="mf. Mama Amina"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Simu (hiari)
              </label>
              <input
                value={mrPhone}
                onChange={(e) => setMrPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Kiasi (TZS)
              </label>
              <input
                value={mrAmount}
                onChange={(e) => setMrAmount(e.target.value)}
                placeholder="15,000"
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Njia</label>
              <select
                value={mrMethod}
                onChange={(e) => setMrMethod(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Kumbukumbu (hiari)
              </label>
              <input
                value={mrReference}
                onChange={(e) => setMrReference(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Maelezo (hiari)
              </label>
              <input
                value={mrDescription}
                onChange={(e) => setMrDescription(e.target.value)}
                placeholder="mf. Ushauri wa haraka"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {mrError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {mrError}
            </p>
          )}
          <button
            type="submit"
            disabled={mrSubmitting}
            className="self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {mrSubmitting ? "Inatengeneza..." : "Tengeneza na Chapisha"}
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 print:hidden">
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="w-full max-w-xs rounded border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">Njia Zote</option>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <p className="text-sm text-zinc-600">
          Jumla: <span className="font-semibold">{fmt(String(totalAmount))}</span>
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna risiti bado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4">Hati</th>
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4 text-right">Kiasi</th>
                <th className="py-2 pr-4">Njia</th>
                <th className="py-2 pr-4">Aliyepokea</th>
                <th className="py-2 pr-4 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/billing/${p.invoice_id}`)}
                  className="cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4">{p.paid_at.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <a
                      href={`/billing/${p.invoice_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-zinc-900 underline"
                    >
                      {p.document_number}
                    </a>
                  </td>
                  <td className="py-2 pr-4">{p.client_name}</td>
                  <td className="py-2 pr-4 text-right font-medium">
                    {fmt(p.amount)}
                  </td>
                  <td className="py-2 pr-4">{p.method}</td>
                  <td className="py-2 pr-4">{p.received_by_name}</td>
                  <td className="py-2 pr-4 text-right print:hidden">
                    <a
                      href={`/print/receipts/${p.invoice_id}/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-zinc-900 underline"
                    >
                      Print
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Risiti Papo kwa Papo
            </h2>
            <p className="text-xs text-zinc-500">
              Hazihesabiwi kwenye Mapato/Finance — kumbukumbu ya kuchapisha tu.
            </p>
          </div>
          <div className="print:hidden">
            <ListToolbar
              filename="manual-receipts"
              columns={MANUAL_CSV_COLUMNS}
              rows={manualReceipts}
            />
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {manualLoading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : manualReceipts.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna risiti papo kwa papo bado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4">Tarehe</th>
                    <th className="py-2 pr-4">Namba</th>
                    <th className="py-2 pr-4">Client</th>
                    <th className="py-2 pr-4 text-right">Kiasi</th>
                    <th className="py-2 pr-4">Njia</th>
                    <th className="py-2 pr-4">Aliyetoa</th>
                    <th className="py-2 pr-4 print:hidden"></th>
                  </tr>
                </thead>
                <tbody>
                  {manualReceipts.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100 last:border-0">
                      <td className="py-2 pr-4">{r.issued_at.slice(0, 10)}</td>
                      <td className="py-2 pr-4 font-medium">{r.receipt_number}</td>
                      <td className="py-2 pr-4">{r.client_name}</td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {fmt(r.amount)}
                      </td>
                      <td className="py-2 pr-4">{r.method}</td>
                      <td className="py-2 pr-4">{r.issued_by_name}</td>
                      <td className="py-2 pr-4 text-right print:hidden">
                        <a
                          href={`/print/receipts/manual/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-zinc-900 underline"
                        >
                          Print
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
