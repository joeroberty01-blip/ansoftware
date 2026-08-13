"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPatientPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("FEMALE");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          dateOfBirth: dateOfBirth || undefined,
          gender,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          emergencyContactName: emergencyContactName || undefined,
          emergencyContactPhone: emergencyContactPhone || undefined,
          bloodType: bloodType || undefined,
          allergies: allergies || undefined,
          chronicConditions: chronicConditions || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Imeshindwa kuongeza mgonjwa.");
        return;
      }
      router.push(`/patients/${json.patient.id}`);
    } catch {
      setError("Hitilafu ya mtandao.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-zinc-900">
        Ongeza Mgonjwa Mpya
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Jina Kamili
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Tarehe ya Kuzaliwa
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Jinsia</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="FEMALE">Female</option>
              <option value="MALE">Male</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Namba ya Simu
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Barua Pepe (hiari)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Blood Type (hiari)
            </label>
            <input
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              placeholder="mf. O+"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-zinc-600">
              Anwani
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Jina la Emergency Contact
            </label>
            <input
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Simu ya Emergency Contact
            </label>
            <input
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Mzio (Allergies)
          </label>
          <textarea
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            rows={2}
            className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">
            Magonjwa Sugu (Chronic Conditions)
          </label>
          <textarea
            value={chronicConditions}
            onChange={(e) => setChronicConditions(e.target.value)}
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
          className="mt-2 self-start rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
        >
          {submitting ? "Inaongeza..." : "Ongeza Mgonjwa"}
        </button>
      </form>
    </div>
  );
}
