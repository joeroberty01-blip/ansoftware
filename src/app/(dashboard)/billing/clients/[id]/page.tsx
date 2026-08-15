"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

const CLIENT_TYPES = ["INDIVIDUAL", "CORPORATE", "INSURANCE"];

export default function ClientBillingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editType, setEditType] = useState("INDIVIDUAL");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const startEditing = () => {
    if (!client) return;
    setEditName(client.name);
    setEditPhone(client.phone);
    setEditEmail(client.email ?? "");
    setEditType(client.type);
    setEditAddress(client.address ?? "");
    setEditError(null);
    setEditing(true);
  };

  const onSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          email: editEmail || undefined,
          type: editType,
          address: editAddress || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setEditing(false);
      await load();
    } catch {
      setEditError("Hitilafu ya mtandao.");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteClient = async () => {
    if (!window.confirm(`Futa client "${client?.name}" KABISA?`)) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json.error ?? "Imeshindwa kufuta.");
        setDeleting(false);
        return;
      }
      router.push("/billing");
    } catch {
      setDeleteError("Hitilafu ya mtandao.");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Inapakia...</div>;
  }
  if (!client) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{client.name}</h1>
          <p className="text-sm text-zinc-600">
            {client.type} — {client.phone}
            {client.email ? ` — ${client.email}` : ""}
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button
              onClick={startEditing}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              Hariri
            </button>
            <button
              onClick={onDeleteClient}
              disabled={deleting}
              className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Inafuta..." : "Futa"}
            </button>
          </div>
        )}
      </div>
      {deleteError && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </p>
      )}

      {editing ? (
        <form
          onSubmit={onSaveClient}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Jina</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Aina</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                {CLIENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Simu</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Barua Pepe
              </label>
              <input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-zinc-600">Anwani</label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {editError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {editError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {saving ? "Inahifadhi..." : "Hifadhi"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Ghairi
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
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
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Hati (Quotations/Invoices)
        </h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna hati bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Historia ya Malipo
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna malipo bado.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
