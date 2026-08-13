"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  total: string;
}
interface Payment {
  id: string;
  amount: string;
  method: string;
  reference: string | null;
  notes: string | null;
  paid_at: string;
}
type DocType = "QUOTATION" | "PROFORMA" | "INVOICE" | "TAX_INVOICE";

const CONVERSION_TARGET_LABEL: Partial<Record<DocType, string>> = {
  QUOTATION: "Geuza kuwa Invoice",
  PROFORMA: "Geuza kuwa Tax Invoice",
};
const PAYABLE_TYPES: DocType[] = ["INVOICE", "TAX_INVOICE"];

interface InvoiceDetail {
  id: string;
  document_number: string;
  doc_type: DocType;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  issue_date: string;
  due_date: string | null;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  amount_paid: string;
  payment_status: string;
  notes: string | null;
  converted_from_id: string | null;
  items: InvoiceItem[];
  payments: Payment[];
}

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

export default function BillingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/invoices/${id}`);
    const json = await res.json();
    setInvoice(json.invoice ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(null);
    setPaying(true);
    try {
      const res = await fetch(`/api/invoices/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method,
          reference: reference || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPayError(json.error ?? "Imeshindwa kurekodi malipo.");
        return;
      }
      setAmount("");
      setReference("");
      await load();
    } catch {
      setPayError("Hitilafu ya mtandao.");
    } finally {
      setPaying(false);
    }
  };

  const onConvert = async () => {
    setConvertError(null);
    setConverting(true);
    try {
      const res = await fetch(`/api/invoices/${id}/convert-to-invoice`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setConvertError(json.error ?? "Imeshindwa kugeuza.");
        return;
      }
      window.location.href = `/billing/${json.invoice.id}`;
    } catch {
      setConvertError("Hitilafu ya mtandao.");
    } finally {
      setConverting(false);
    }
  };

  const onCancel = async () => {
    if (!invoice) return;
    if (
      !window.confirm(
        `Una uhakika unataka kughairi ${invoice.document_number}? Hatua hii haiwezi kutenduliwa.`
      )
    ) {
      return;
    }
    setCancelError(null);
    setCancelling(true);
    try {
      const res = await fetch(`/api/invoices/${id}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setCancelError(json.error ?? "Imeshindwa kughairi.");
        return;
      }
      await load();
    } catch {
      setCancelError("Hitilafu ya mtandao.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Inapakia...</div>;
  }
  if (!invoice) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  const convertLabel = CONVERSION_TARGET_LABEL[invoice.doc_type];
  const isPayable = PAYABLE_TYPES.includes(invoice.doc_type);
  const canPay =
    invoice.payment_status !== "PAID" &&
    invoice.payment_status !== "CANCELLED";
  const canCancel =
    invoice.payment_status !== "CANCELLED" &&
    Number(invoice.amount_paid) === 0;

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {invoice.document_number}
          </h1>
          <p className="text-sm text-zinc-600">
            {invoice.doc_type} — {invoice.client_name}
          </p>
        </div>
        <div className="flex gap-2">
          {convertLabel && (
            <button
              onClick={onConvert}
              disabled={converting}
              className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {converting ? "Inageuza..." : convertLabel}
            </button>
          )}
          <a
            href={`/print/invoices/${invoice.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Print
          </a>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Pakua PDF
          </a>
          {canCancel && (
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelling ? "Inaghairi..." : "Ghairi"}
            </button>
          )}
        </div>
      </div>
      {convertError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {convertError}
        </p>
      )}
      {cancelError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {cancelError}
        </p>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-zinc-500">Status</p>
            <p className="font-medium">{invoice.payment_status}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Jumla</p>
            <p className="font-medium">{fmt(invoice.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Imelipwa</p>
            <p className="font-medium">{fmt(invoice.amount_paid)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Tarehe</p>
            <p className="font-medium">{invoice.issue_date.slice(0, 10)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Items</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <th className="py-2 pr-4">Maelezo</th>
              <th className="py-2 pr-4 text-right">Idadi</th>
              <th className="py-2 pr-4 text-right">Bei</th>
              <th className="py-2 pr-4 text-right">Jumla</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                <td className="py-2 pr-4">{item.description}</td>
                <td className="py-2 pr-4 text-right">{item.quantity}</td>
                <td className="py-2 pr-4 text-right">{fmt(item.unit_price)}</td>
                <td className="py-2 pr-4 text-right">{fmt(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPayable && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Historia ya Malipo
          </h2>
          {invoice.payments.length === 0 ? (
            <p className="mb-4 text-sm text-zinc-500">Hakuna malipo bado.</p>
          ) : (
            <table className="mb-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-4">Tarehe</th>
                  <th className="py-2 pr-4">Njia</th>
                  <th className="py-2 pr-4">Kumbukumbu</th>
                  <th className="py-2 pr-4 text-right">Kiasi</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4">{p.paid_at.slice(0, 10)}</td>
                    <td className="py-2 pr-4">{p.method}</td>
                    <td className="py-2 pr-4">{p.reference ?? "-"}</td>
                    <td className="py-2 pr-4 text-right">{fmt(p.amount)}</td>
                    <td className="py-2 pr-4 text-right">
                      <a
                        href={`/print/receipts/${invoice.id}/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-2 text-xs font-medium text-zinc-900 underline"
                      >
                        Print Risiti
                      </a>
                      <a
                        href={`/api/invoices/${invoice.id}/payments/${p.id}/receipt`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-zinc-900 underline"
                      >
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {canPay && (
            <form onSubmit={onPay} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Kiasi"
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Kumbukumbu (hiari)"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={paying}
                className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {paying ? "Inarekodi..." : "Rekodi Malipo"}
              </button>
            </form>
          )}
          {payError && (
            <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {payError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
