"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Visit {
  id: string;
  patient_name: string;
  staff_name: string | null;
  visit_date: string;
  status: string;
  location: string | null;
  blood_pressure: string | null;
  temperature: string | null;
  pulse: number | null;
  weight: string | null;
  blood_glucose: string | null;
  food_intake: string | null;
  treatment_notes: string | null;
  notes: string | null;
}

export default function HomeVisitDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [status, setStatus] = useState("SCHEDULED");
  const [location, setLocation] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodGlucose, setBloodGlucose] = useState("");
  const [foodIntake, setFoodIntake] = useState("");
  const [treatmentNotes, setTreatmentNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/home-visits/${id}`);
    const json = await res.json();
    setVisit(json.visit ?? null);
    if (json.visit) {
      setStatus(json.visit.status);
      setLocation(json.visit.location ?? "");
      setBloodPressure(json.visit.blood_pressure ?? "");
      setTemperature(json.visit.temperature ?? "");
      setPulse(json.visit.pulse != null ? String(json.visit.pulse) : "");
      setWeight(json.visit.weight ?? "");
      setBloodGlucose(json.visit.blood_glucose ?? "");
      setFoodIntake(json.visit.food_intake ?? "");
      setTreatmentNotes(json.visit.treatment_notes ?? "");
      setNotes(json.visit.notes ?? "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/home-visits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          location: location || undefined,
          bloodPressure: bloodPressure || undefined,
          temperature: temperature || undefined,
          pulse: pulse ? Number(pulse) : undefined,
          weight: weight || undefined,
          bloodGlucose: bloodGlucose || undefined,
          foodIntake: foodIntake || undefined,
          treatmentNotes: treatmentNotes || undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setEditing(false);
      await load();
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Futa home visit hii? Hatua hii haiwezi kutenduliwa.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/home-visits/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Imeshindwa kufuta.");
        setDeleting(false);
        return;
      }
      router.push("/home-visits");
    } catch {
      setError("Hitilafu ya mtandao.");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Inapakia...</div>;
  }
  if (!visit) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {visit.patient_name}
          </h1>
          <p className="text-sm text-zinc-600">
            {visit.visit_date.slice(0, 10)} — Staff: {visit.staff_name ?? "-"}
            {visit.location ? ` — ${visit.location}` : ""}
          </p>
        </div>
        {!editing && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              Hariri
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Inafuta..." : "Futa"}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <form
          onSubmit={onSave}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1 sm:col-span-4">
              <label className="text-xs font-medium text-zinc-600">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-40 rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-zinc-600">
                Location (mahali pa ziara)
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Anwani ya ziara"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Blood Pressure
              </label>
              <input
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Temp (°C)
              </label>
              <input
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Pulse
              </label>
              <input
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                inputMode="numeric"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Weight (kg)
              </label>
              <input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                inputMode="decimal"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Sukari / Blood Glucose
              </label>
              <input
                value={bloodGlucose}
                onChange={(e) => setBloodGlucose(e.target.value)}
                inputMode="decimal"
                placeholder="mf. 5.5"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-zinc-600">
                Chakula / Ulishaji (Food Intake)
              </label>
              <input
                value={foodIntake}
                onChange={(e) => setFoodIntake(e.target.value)}
                placeholder="mf. Alikula ugali na mboga..."
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Maelezo ya Matibabu
            </label>
            <textarea
              value={treatmentNotes}
              onChange={(e) => setTreatmentNotes(e.target.value)}
              rows={3}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Maelezo Mengine
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>

          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
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
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-500">Status</p>
              <p className="font-medium">{visit.status}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Location</p>
              <p className="font-medium">{visit.location ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Blood Pressure</p>
              <p className="font-medium">{visit.blood_pressure ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Temp</p>
              <p className="font-medium">
                {visit.temperature ? `${visit.temperature} °C` : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Pulse</p>
              <p className="font-medium">{visit.pulse ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Weight</p>
              <p className="font-medium">
                {visit.weight ? `${visit.weight} kg` : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Sukari (Blood Glucose)</p>
              <p className="font-medium">
                {visit.blood_glucose ? `${visit.blood_glucose} mmol/L` : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Chakula (Food Intake)</p>
              <p className="font-medium">{visit.food_intake ?? "-"}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-zinc-500">Maelezo ya Matibabu</p>
            <p className="mt-1 text-sm">
              {visit.treatment_notes || "Hakuna kilichorekodiwa"}
            </p>
          </div>
          {visit.notes && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500">Maelezo Mengine</p>
              <p className="mt-1 text-sm">{visit.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
