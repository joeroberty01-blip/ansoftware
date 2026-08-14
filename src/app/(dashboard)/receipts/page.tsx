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

const CSV_COLUMNS = [
  { key: "paid_at", label: "Tarehe" },
  { key: "document_number", label: "Hati" },
  { key: "client_name", label: "Client" },
  { key: "amount", label: "Kiasi" },
  { key: "method", label: "Njia" },
  { key: "reference", label: "Kumbukumbu" },
  { key: "received_by_name", label: "Aliyepokea" },
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/payments");
    const json = await res.json();
    setPayments(json.payments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = methodFilter
    ? payments.filter((p) => p.method === methodFilter)
    : payments;

  const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amount), 0);
  const methods = Array.from(new Set(payments.map((p) => p.method)));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Receipts</h1>
        <ListToolbar filename="receipts" columns={CSV_COLUMNS} rows={filtered} />
      </div>

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

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna risiti bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
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
        )}
      </div>
    </div>
  );
}
