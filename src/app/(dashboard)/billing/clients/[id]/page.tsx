"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  type: string;
  address: string | null;
}

interface Invoice {
  id: string;
  document_number: string;
  doc_type: string;
  total_amount: string;
  amount_paid: string;
  payment_status: string;
  issue_date: string;
}

interface Payment {
  id: string;
  amount: string;
  method: string;
  reference: string | null;
  paid_at: string;
  invoice_id: string;
  document_number: string;
}

function fmt(value: string) {
  return new Intl.NumberFormat("en-TZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function ClientBillingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [clientRes, invoicesRes, paymentsRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/invoices?clientId=${id}`),
      fetch(`/api/clients/${id}/payments`),
    ]);
    const clientJson = await clientRes.json();
    const invoicesJson = await invoicesRes.json();
    const paymentsJson = await paymentsRes.json();
    setClient(clientJson.client ?? null);
    setInvoices(invoicesJson.invoices ?? []);
    setPayments(paymentsJson.payments ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Inapakia...</div>;
  }
  if (!client) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{client.name}</h1>
        <p className="text-sm text-zinc-600">
          {client.type} — {client.phone}
          {client.email ? ` — ${client.email}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-zinc-500">Anwani</p>
            <p className="font-medium">{client.address ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Idadi ya Hati</p>
            <p className="font-medium">{invoices.length}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Jumla Aliyolipa</p>
            <p className="font-medium">{fmt(String(totalPaid))}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Hati (Quotations/Invoices)
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna hati bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Namba</th>
                <th className="py-2 pr-4">Aina</th>
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4 text-right">Jumla</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-4">
                    <Link
                      href={`/billing/${inv.id}`}
                      className="font-medium text-zinc-900 underline"
                    >
                      {inv.document_number}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{inv.doc_type}</td>
                  <td className="py-2 pr-4">{inv.issue_date.slice(0, 10)}</td>
                  <td className="py-2 pr-4 text-right">
                    {fmt(inv.total_amount)}
                  </td>
                  <td className="py-2 pr-4">{inv.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Historia ya Malipo
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna malipo bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                <th className="py-2 pr-4">Tarehe</th>
                <th className="py-2 pr-4">Hati</th>
                <th className="py-2 pr-4">Njia</th>
                <th className="py-2 pr-4">Kumbukumbu</th>
                <th className="py-2 pr-4 text-right">Kiasi</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                  <td className="py-2 pr-4">{p.paid_at.slice(0, 10)}</td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/billing/${p.invoice_id}`}
                      className="text-zinc-700 underline"
                    >
                      {p.document_number}
                    </Link>
                  </td>
                  <td className="py-2 pr-4">{p.method}</td>
                  <td className="py-2 pr-4">{p.reference ?? "-"}</td>
                  <td className="py-2 pr-4 text-right">{fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
