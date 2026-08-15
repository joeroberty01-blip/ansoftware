"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Patient {
  id: string;
  full_name: string;
  address: string | null;
}

interface StaffOption {
  id: string;
  full_name: string;
}

export function NewHomeVisitForm({
  isAdmin,
  ownStaffId,
  ownStaffName,
}: {
  isAdmin: boolean;
  ownStaffId: string | null;
  ownStaffName: string | null;
}) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  const [patientId, setPatientId] = useState("");
  const [staffId, setStaffId] = useState(ownStaffId ?? "");
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState("COMPLETED");
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/patients")
      .then((r) => r.json())
      .then((json: { patients?: Patient[] }) => {
        const list = json.patients ?? [];
        setPatients(list);
        if (list[0]) {
          setPatientId((prev) => prev || list[0].id);
          setLocation((prev) => prev || list[0].address || "");
        }
      });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/staff")
      .then((r) => r.json())
      .then((json: { staff?: { id: string; full_name: string }[] }) => {
        setStaffOptions(
          (json.staff ?? []).map((s) => ({ id: s.id, full_name: s.full_name }))
        );
      });
  }, [isAdmin]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!patientId) {
      setError("Chagua mgonjwa.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/home-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          staffId: staffId || undefined,
          visitDate,
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
        setError(json.error ?? "Imeshindwa kurekodi ziara.");
        return;
      }
      router.push(`/home-visits/${json.visit.id}`);
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
        Rekodi Home Visit
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Mgonjwa
            </label>
            <select
              value={patientId}
              onChange={(e) => {
                const next = e.target.value;
                setPatientId(next);
                const patient = patients.find((p) => p.id === next);
                if (patient) setLocation(patient.address || "");
              }}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">-- chagua mgonjwa --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
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
            <label className="text-xs font-medium text-zinc-600">Staff</label>
            {isAdmin ? (
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">-- chagua staff --</option>
                {staffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={ownStaffName ?? "Huna wasifu wa Staff"}
                disabled
                className="rounded border border-zinc-300 bg-zinc-100 px-2 py-1.5 text-sm text-zinc-600"
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Tarehe ya Ziara
            </label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <h2 className="mt-2 text-sm font-semibold text-zinc-900">Vitals</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Blood Pressure
            </label>
            <input
              value={bloodPressure}
              onChange={(e) => setBloodPressure(e.target.value)}
              placeholder="mf. 120/80"
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
              placeholder="36.5"
              inputMode="decimal"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Pulse</label>
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
          <div className="flex flex-col gap-1 sm:col-span-3">
            <label className="text-xs font-medium text-zinc-600">
              Chakula / Ulishaji (Food Intake)
            </label>
            <input
              value={foodIntake}
              onChange={(e) => setFoodIntake(e.target.value)}
              placeholder="mf. Alikula ugali na mboga, kikombe 1 cha chai..."
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Maelezo ya Matibabu (Treatment Notes)
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
            Maelezo Mengine (hiari)
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

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {submitting ? "Inarekodi..." : "Rekodi Ziara"}
        </button>
      </form>
    </div>
  );
}
