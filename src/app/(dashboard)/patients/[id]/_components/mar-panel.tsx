"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MAR_SLOTS,
  MAR_SLOT_LABELS,
  MAR_STATUS_LABELS,
  effectiveSlots,
  type MarSlot,
  type MarStatus,
} from "@/lib/mar";

interface MarMedication {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  schedule_slots: string[];
}

interface MarAdministration {
  id: string;
  medication_id: string;
  slot: MarSlot;
  status: MarStatus;
  given_at: string | null;
  administered_by_name: string | null;
  notes: string | null;
}

interface HistoryDay {
  date: string;
  given: number;
  missed: number;
  refused: number;
}

interface MarResponse {
  date: string;
  today: string;
  medications: MarMedication[];
  administrations: MarAdministration[];
  history: HistoryDay[];
}

type CellStatus = MarStatus | "PENDING";

const STATUS_STYLES: Record<CellStatus, string> = {
  GIVEN: "bg-green-100 text-green-700",
  MISSED: "bg-red-100 text-red-700",
  REFUSED: "bg-amber-100 text-amber-700",
  PENDING: "bg-zinc-100 text-zinc-600",
};

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dar_es_Salaam",
  });
}

export function MarPanel({
  patientId,
  refreshKey,
}: {
  patientId: string;
  /** Bump to reload after a medication is added elsewhere on the page. */
  refreshKey: number;
}) {
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<MarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ medId: string; slot: MarSlot } | null>(null);
  const [givenTime, setGivenTime] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (d: string | null) => {
      const qs = d ? `?date=${d}` : "";
      const res = await fetch(`/api/patients/${patientId}/mar${qs}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kupakia MAR.");
        return;
      }
      setError(null);
      setData(json);
      setDate(json.date);
    },
    [patientId]
  );

  useEffect(() => {
    load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, refreshKey]);

  const goTo = (d: string) => {
    setEditing(null);
    setDate(d);
    load(d);
  };

  const adminFor = (medId: string, slot: MarSlot) =>
    data?.administrations.find((a) => a.medication_id === medId && a.slot === slot);

  const openEditor = (medId: string, slot: MarSlot) => {
    const existing = adminFor(medId, slot);
    setEditing({ medId, slot });
    setGivenTime(existing?.given_at ? formatTime(existing.given_at) : "");
    setNote(existing?.notes ?? "");
  };

  const record = async (status: CellStatus) => {
    if (!editing || !data) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/mar`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationId: editing.medId,
          date: data.date,
          slot: editing.slot,
          status,
          givenTime: status === "GIVEN" ? givenTime : "",
          notes: status === "PENDING" ? "" : note,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setEditing(null);
      await load(data.date);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (!data) {
    return (
      <p className="text-sm text-zinc-500">{error ?? "Inapakia MAR..."}</p>
    );
  }

  const isToday = data.date === data.today;
  const editingMed = editing
    ? data.medications.find((m) => m.id === editing.medId)
    : null;

  return (
    <div className="mb-6 rounded-lg border border-zinc-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Medication Administration Record (MAR)
          </h2>
          <p className="text-xs text-zinc-500">
            Bonyeza kisanduku kurekodi: Given, Missed au Refused.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(shiftDate(data.date, -1))}
            className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50"
            aria-label="Siku iliyopita"
          >
            ‹
          </button>
          <input
            type="date"
            value={data.date}
            max={data.today}
            onChange={(e) => e.target.value && goTo(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => goTo(shiftDate(data.date, 1))}
            disabled={isToday}
            className="rounded border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 disabled:opacity-40"
            aria-label="Siku inayofuata"
          >
            ›
          </button>
          {!isToday && (
            <button
              type="button"
              onClick={() => goTo(data.today)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50"
            >
              Leo
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {data.medications.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Hakuna dawa zinazotumika siku hii. Ongeza dawa hapa chini.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="py-2 pr-4">Dawa</th>
                {MAR_SLOTS.map((s) => (
                  <th key={s} className="py-2 pr-4">
                    {MAR_SLOT_LABELS[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.medications.map((m) => {
                const slots = effectiveSlots(m.schedule_slots);
                return (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="font-medium">{m.medication_name}</span>
                      <span className="block text-xs text-zinc-500">
                        {[m.dosage, m.frequency].filter(Boolean).join(" · ") || "-"}
                      </span>
                    </td>
                    {MAR_SLOTS.map((slot) => {
                      if (!slots.includes(slot)) {
                        return (
                          <td key={slot} className="py-2 pr-4 text-zinc-300">
                            —
                          </td>
                        );
                      }
                      const a = adminFor(m.id, slot);
                      const status: CellStatus = a?.status ?? "PENDING";
                      const selected =
                        editing?.medId === m.id && editing.slot === slot;
                      return (
                        <td key={slot} className="py-2 pr-4 align-top">
                          <button
                            type="button"
                            onClick={() => openEditor(m.id, slot)}
                            className={`rounded px-2 py-1 text-xs font-semibold ${STATUS_STYLES[status]} ${
                              selected ? "ring-2 ring-brand-blue" : ""
                            }`}
                          >
                            {MAR_STATUS_LABELS[status]}
                          </button>
                          {a && (
                            <span className="mt-1 block text-xs text-zinc-500">
                              {a.given_at ? `${formatTime(a.given_at)} · ` : ""}
                              {a.administered_by_name ?? ""}
                              {a.notes ? ` — ${a.notes}` : ""}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && editingMed && (
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <p className="w-full text-sm font-medium text-zinc-900">
            {editingMed.medication_name} — {MAR_SLOT_LABELS[editing.slot]} ({data.date})
          </p>
          <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
            Saa aliyotumia (hiari)
            <input
              type="time"
              value={givenTime}
              onChange={(e) => setGivenTime(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium text-zinc-600">
            Maelezo (hiari)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mf. alikataa kwa sababu ya kichefuchefu"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => record("GIVEN")}
              className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Given
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => record("MISSED")}
              className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Missed
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => record("REFUSED")}
              className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              Refused
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => record("PENDING")}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-white disabled:opacity-50"
            >
              Futa (Pending)
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-800"
            >
              Funga
            </button>
          </div>
        </div>
      )}

      {data.history.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Historia (siku 14 zilizopita)
          </p>
          <div className="flex flex-wrap gap-2">
            {data.history.map((h) => (
              <button
                key={h.date}
                type="button"
                onClick={() => goTo(h.date)}
                className={`rounded border px-2 py-1 text-xs ${
                  h.date === data.date
                    ? "border-brand-blue bg-brand-blue-light"
                    : "border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                <span className="font-medium">{h.date}</span>{" "}
                <span className="text-green-700">{h.given} G</span>
                {h.missed > 0 && <span className="text-red-700"> · {h.missed} M</span>}
                {h.refused > 0 && (
                  <span className="text-amber-700"> · {h.refused} R</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
