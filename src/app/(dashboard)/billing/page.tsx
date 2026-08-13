"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListToolbar } from "../_components/list-toolbar";

const CSV_COLUMNS = [
  { key: "document_number", label: "Namba" },
  { key: "doc_type", label: "Aina" },
  { key: "client_name", label: "Client" },
  { key: "issue_date", label: "Tarehe" },
  { key: "total_amount", label: "Jumla" },
  { key: "amount_paid", label: "Imelipwa" },
  { key: "payment_status", label: "Status" },
];

interface InvoiceListItem {
  id: string;
  document_number: string;
  doc_type: "QUOTATION" | "INVOICE";
  client_id: string;
  client_name: string;
  total_amount: string;
  amount_paid: string;
  payment_status: string;
  issue_date: string;
}

const DOC_TYPE_OPTIONS = [
  { value: "", label: "Zote" },
  { value: "QUOTATION", label: "Quotation" },
  { value: "PROFORMA", label: "Proforma Invoice" },
  { value: "INVOICE", label: "Invoice" },
  { value: "TAX_INVOICE", label: "Tax Invoice" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Zote" },
  { value: "PENDING", label: "Pending" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatMoney(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [docType, setDocType] = useState("");
  const [status, setStatus] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (docType) params.set("docType", docType);
    if (status) params.set("paymentStatus", status);
    if (outstandingOnly) params.set("outstanding", "true");
    const res = await fetch(`/api/invoices?${params.toString()}`);
    const json = await res.json();
    setInvoices(json.invoices ?? []);
    setLoading(false);
  }, [docType, status, outstandingOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">
          Billing / Invoices
        </h1>
        <div className="flex gap-2">
          <ListToolbar
            filename="invoices"
            columns={CSV_COLUMNS}
            rows={invoices}
          />
          <Link
            href="/billing/new"
            className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark print:hidden"
          >
            Tengeneza Mpya
          </Link>
        </div>
      </div>

      <div className="flex gap-3 print:hidden">
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {DOC_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={outstandingOnly}
            onChange={(e) => setOutstandingOnly(e.target.checked)}
          />
          Outstanding Pekee
        </label>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna rekodi.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Namba</th>
                <th className="py-2 pr-4">Aina</th>
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4 text-right">Jumla</th>
                <th className="py-2 pr-4 text-right">Imelipwa</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="py-2 pr-4">
                    <Link
                      href={`/billing/${inv.id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {inv.document_number}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{inv.doc_type}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/billing/clients/${inv.client_id}`}
                      className="text-zinc-700 underline"
                    >
                      {inv.client_name}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{inv.issue_date.slice(0, 10)}</td>
                  <td className="py-2 pr-4 text-right">
                    {formatMoney(inv.total_amount)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {formatMoney(inv.amount_paid)}
                  </td>
                  <td className="py-2 pr-4">{inv.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
