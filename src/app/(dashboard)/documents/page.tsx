"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ListToolbar } from "../_components/list-toolbar";

const CSV_COLUMNS = [
  { key: "patient_name", label: "Mgonjwa" },
  { key: "title", label: "Jina" },
  { key: "document_type", label: "Aina" },
  { key: "notes", label: "Maelezo" },
  { key: "uploaded_by_name", label: "Aliyepakia" },
  { key: "created_at", label: "Tarehe" },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  LAB_RESULT: "Lab Result",
  CONSENT_FORM: "Consent Form",
  PRESCRIPTION: "Prescription",
  REFERRAL: "Referral",
  OTHER: "Other",
};

interface DocumentRow {
  id: string;
  patient_id: string;
  patient_name: string;
  title: string;
  document_type: string;
  notes: string | null;
  uploaded_by_name: string;
  created_at: string;
}

interface PatientOption {
  id: string;
  full_name: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("LAB_RESULT");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    const res = await fetch(`/api/documents?${params.toString()}`);
    const json = await res.json();
    setDocuments(json.documents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load("");
    fetch("/api/patients")
      .then((r) => r.json())
      .then((json: { patients?: PatientOption[] }) => {
        const list = json.patients ?? [];
        setPatients(list);
        if (list[0]) setPatientId((prev) => prev || list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  const onAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!patientId) {
      setError("Chagua mgonjwa.");
      return;
    }
    if (!title.trim()) {
      setError("Jaza jina la document.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          documentType: docType,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuongeza document.");
        return;
      }
      setTitle("");
      setNotes("");
      setShowAdd(false);
      await load(search);
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Documents</h1>
        <div className="flex gap-2">
          <ListToolbar filename="documents" columns={CSV_COLUMNS} rows={documents} />
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark print:hidden"
          >
            {showAdd ? "Funga" : "Ongeza Document"}
          </button>
        </div>
      </div>

      <form onSubmit={onSearchSubmit} className="flex flex-wrap items-center gap-2 print:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tafuta kwa jina la mgonjwa au document..."
          className="w-full max-w-sm rounded border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
        >
          Tafuta
        </button>
      </form>

      {showAdd && (
        <form
          onSubmit={onAddDocument}
          className="grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden"
        >
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">-- chagua mgonjwa --</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Jina la Document"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="LAB_RESULT">Lab Result</option>
            <option value="CONSENT_FORM">Consent Form</option>
            <option value="PRESCRIPTION">Prescription</option>
            <option value="REFERRAL">Referral</option>
            <option value="OTHER">Other</option>
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Maelezo (hiari)"
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
          {error && (
            <p className="col-span-full rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="col-span-full self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
          >
            {submitting ? "Inahifadhi..." : "Hifadhi Document"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-zinc-500">Inapakia...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-zinc-500">Hakuna documents bado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Mgonjwa</th>
                  <th className="py-2 pr-4">Jina</th>
                  <th className="py-2 pr-4">Aina</th>
                  <th className="py-2 pr-4">Maelezo</th>
                  <th className="py-2 pr-4">Aliyepakia</th>
                  <th className="py-2 pr-4">Tarehe</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/patients/${d.patient_id}`}
                        className="font-medium text-zinc-900 underline"
                      >
                        {d.patient_name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{d.title}</td>
                    <td className="py-2 pr-4">
                      {DOC_TYPE_LABELS[d.document_type] ?? d.document_type}
                    </td>
                    <td className="py-2 pr-4">{d.notes ?? "-"}</td>
                    <td className="py-2 pr-4">{d.uploaded_by_name}</td>
                    <td className="py-2 pr-4">{d.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
