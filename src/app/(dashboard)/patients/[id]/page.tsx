"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardPlus, Stethoscope } from "lucide-react";

interface Patient {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  notes: string | null;
}

interface Medication {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
}

interface PatientDocument {
  id: string;
  title: string;
  document_type: string;
  notes: string | null;
  created_at: string;
}

interface HomeVisit {
  id: string;
  staff_name: string | null;
  visit_date: string;
  status: string;
  location: string | null;
  blood_pressure: string | null;
  temperature: string | null;
  pulse: number | null;
  weight: string | null;
  treatment_notes: string | null;
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"medications" | "documents" | "homeVisits">(
    "homeVisits"
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => setIsAdmin(json.user?.role === "ADMIN"))
      .catch(() => {});
  }, []);

  const onDeletePatient = async () => {
    if (
      !window.confirm(
        "Futa mgonjwa huyu KABISA? Hii itafuta pia dawa, documents, na home visits zote za mgonjwa huyu. Hatua hii haiwezi kutenduliwa."
      )
    ) {
      return;
    }
    setDeletingPatient(true);
    try {
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error ?? "Imeshindwa kufuta mgonjwa.");
        setDeletingPatient(false);
        return;
      }
      router.push("/patients");
    } catch {
      alert("Hitilafu ya mtandao.");
      setDeletingPatient(false);
    }
  };

  const loadPatient = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/patients/${id}`);
    const json = await res.json();
    setPatient(json.patient ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  // --- Edit patient ---
  const [editing, setEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editBloodType, setEditBloodType] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editChronic, setEditChronic] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEditing = () => {
    if (!patient) return;
    setEditFullName(patient.full_name);
    setEditDob(patient.date_of_birth?.slice(0, 10) ?? "");
    setEditGender(patient.gender ?? "");
    setEditPhone(patient.phone ?? "");
    setEditEmail(patient.email ?? "");
    setEditAddress(patient.address ?? "");
    setEditEmergencyName(patient.emergency_contact_name ?? "");
    setEditEmergencyPhone(patient.emergency_contact_phone ?? "");
    setEditBloodType(patient.blood_type ?? "");
    setEditAllergies(patient.allergies ?? "");
    setEditChronic(patient.chronic_conditions ?? "");
    setEditNotes(patient.notes ?? "");
    setEditError(null);
    setEditing(true);
  };

  const onSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editFullName,
          dateOfBirth: editDob || undefined,
          gender: editGender || undefined,
          phone: editPhone || undefined,
          email: editEmail || undefined,
          address: editAddress || undefined,
          emergencyContactName: editEmergencyName || undefined,
          emergencyContactPhone: editEmergencyPhone || undefined,
          bloodType: editBloodType || undefined,
          allergies: editAllergies || undefined,
          chronicConditions: editChronic || undefined,
          notes: editNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error ?? "Imeshindwa kuhifadhi.");
        return;
      }
      setEditing(false);
      await loadPatient();
    } catch {
      setEditError("Hitilafu ya mtandao.");
    } finally {
      setSaving(false);
    }
  };

  // --- Medications ---
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medStartDate, setMedStartDate] = useState("");
  const [medError, setMedError] = useState<string | null>(null);
  const [addingMed, setAddingMed] = useState(false);

  const loadMedications = useCallback(async () => {
    const res = await fetch(`/api/patients/${id}/medications`);
    const json = await res.json();
    setMedications(json.medications ?? []);
  }, [id]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const onAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    setMedError(null);
    setAddingMed(true);
    try {
      const res = await fetch(`/api/patients/${id}/medications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicationName: medName,
          dosage: medDosage || undefined,
          frequency: medFrequency || undefined,
          startDate: medStartDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMedError(json.error ?? "Imeshindwa kuongeza dawa.");
        return;
      }
      setMedName("");
      setMedDosage("");
      setMedFrequency("");
      setMedStartDate("");
      await loadMedications();
    } catch {
      setMedError("Hitilafu ya mtandao.");
    } finally {
      setAddingMed(false);
    }
  };

  // --- Documents ---
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState("LAB_RESULT");
  const [docNotes, setDocNotes] = useState("");
  const [docError, setDocError] = useState<string | null>(null);
  const [addingDoc, setAddingDoc] = useState(false);

  const loadDocuments = useCallback(async () => {
    const res = await fetch(`/api/patients/${id}/documents`);
    const json = await res.json();
    setDocuments(json.documents ?? []);
  }, [id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const onAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError(null);
    setAddingDoc(true);
    try {
      const res = await fetch(`/api/patients/${id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle,
          documentType: docType,
          notes: docNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setDocError(json.error ?? "Imeshindwa kuongeza document.");
        return;
      }
      setDocTitle("");
      setDocNotes("");
      await loadDocuments();
    } catch {
      setDocError("Hitilafu ya mtandao.");
    } finally {
      setAddingDoc(false);
    }
  };

  // --- Home Visits ---
  const [homeVisits, setHomeVisits] = useState<HomeVisit[]>([]);

  const loadHomeVisits = useCallback(async () => {
    const res = await fetch(`/api/home-visits?patientId=${id}`);
    const json = await res.json();
    setHomeVisits(json.visits ?? []);
  }, [id]);

  useEffect(() => {
    loadHomeVisits();
  }, [loadHomeVisits]);

  // --- Quick daily report (add today's visit without leaving this page) ---
  const [showQuickReport, setShowQuickReport] = useState(false);
  const [qrBloodPressure, setQrBloodPressure] = useState("");
  const [qrTemperature, setQrTemperature] = useState("");
  const [qrPulse, setQrPulse] = useState("");
  const [qrWeight, setQrWeight] = useState("");
  const [qrTreatmentNotes, setQrTreatmentNotes] = useState("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrSubmitting, setQrSubmitting] = useState(false);

  const onAddQuickReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setQrError(null);
    setQrSubmitting(true);
    try {
      const res = await fetch(`/api/home-visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: id,
          visitDate: new Date().toISOString().slice(0, 10),
          status: "COMPLETED",
          location: patient?.address || undefined,
          bloodPressure: qrBloodPressure || undefined,
          temperature: qrTemperature || undefined,
          pulse: qrPulse ? Number(qrPulse) : undefined,
          weight: qrWeight || undefined,
          treatmentNotes: qrTreatmentNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setQrError(json.error ?? "Imeshindwa kuongeza ripoti.");
        return;
      }
      setQrBloodPressure("");
      setQrTemperature("");
      setQrPulse("");
      setQrWeight("");
      setQrTreatmentNotes("");
      setShowQuickReport(false);
      await loadHomeVisits();
    } catch {
      setQrError("Hitilafu ya mtandao.");
    } finally {
      setQrSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-zinc-500">Inapakia...</div>;
  }
  if (!patient) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            {patient.full_name}
          </h1>
          <p className="text-sm text-zinc-600">
            {patient.gender ?? "-"} — {patient.date_of_birth?.slice(0, 10) ?? "-"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!editing && (
            <button
              onClick={startEditing}
              className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Hariri
            </button>
          )}
          <Link
            href={`/print/patients/${id}/report`}
            target="_blank"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Print Ripoti (kwa Familia)
          </Link>
          {isAdmin && !editing && (
            <button
              onClick={onDeletePatient}
              disabled={deletingPatient}
              className="rounded border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deletingPatient ? "Inafuta..." : "Futa"}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={onSavePatient}
          className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-zinc-600">
                Jina Kamili
              </label>
              <input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Tarehe ya Kuzaliwa
              </label>
              <input
                type="date"
                value={editDob}
                onChange={(e) => setEditDob(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Jinsia
              </label>
              <select
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">-- chagua --</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Blood Type
              </label>
              <input
                value={editBloodType}
                onChange={(e) => setEditBloodType(e.target.value)}
                placeholder="mf. O+"
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Simu
              </label>
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
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-medium text-zinc-600">
                Anwani
              </label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Emergency Contact - Jina
              </label>
              <input
                value={editEmergencyName}
                onChange={(e) => setEditEmergencyName(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">
                Emergency Contact - Simu
              </label>
              <input
                value={editEmergencyPhone}
                onChange={(e) => setEditEmergencyPhone(e.target.value)}
                className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Mzio (Allergies)
            </label>
            <textarea
              value={editAllergies}
              onChange={(e) => setEditAllergies(e.target.value)}
              rows={2}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Magonjwa Sugu
            </label>
            <textarea
              value={editChronic}
              onChange={(e) => setEditChronic(e.target.value)}
              rows={2}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Maelezo Mengine
            </label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
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
              className="rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
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
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Simu</p>
              <p className="font-medium">{patient.phone ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Blood Type</p>
              <p className="font-medium">{patient.blood_type ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Anwani</p>
              <p className="font-medium">{patient.address ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Emergency Contact</p>
              <p className="font-medium">
                {patient.emergency_contact_name ?? "-"}
                {patient.emergency_contact_phone
                  ? ` (${patient.emergency_contact_phone})`
                  : ""}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-zinc-500">Mzio (Allergies)</p>
              <p className="font-medium text-red-700">
                {patient.allergies || "Hakuna kilichorekodiwa"}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs text-zinc-500">Magonjwa Sugu</p>
              <p className="font-medium">
                {patient.chronic_conditions || "Hakuna kilichorekodiwa"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setTab("medications")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "medications"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Medications
        </button>
        <button
          onClick={() => setTab("documents")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "documents"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => setTab("homeVisits")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "homeVisits"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-500"
          }`}
        >
          Home Visits
        </button>
      </div>

      {tab === "medications" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <form
            onSubmit={onAddMedication}
            className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <input
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              placeholder="Jina la Dawa"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              value={medDosage}
              onChange={(e) => setMedDosage(e.target.value)}
              placeholder="Dosage (mf. 500mg)"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              value={medFrequency}
              onChange={(e) => setMedFrequency(e.target.value)}
              placeholder="Frequency"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={medStartDate}
              onChange={(e) => setMedStartDate(e.target.value)}
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={addingMed}
              className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {addingMed ? "Inaongeza..." : "Ongeza Dawa"}
            </button>
          </form>
          {medError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {medError}
            </p>
          )}
          {medications.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna dawa zilizorekodiwa.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-4">Dawa</th>
                  <th className="py-2 pr-4">Dosage</th>
                  <th className="py-2 pr-4">Frequency</th>
                  <th className="py-2 pr-4">Ilianza</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((m) => (
                  <tr key={m.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4 font-medium">{m.medication_name}</td>
                    <td className="py-2 pr-4">{m.dosage ?? "-"}</td>
                    <td className="py-2 pr-4">{m.frequency ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {m.start_date?.slice(0, 10) ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <form
            onSubmit={onAddDocument}
            className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
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
              value={docNotes}
              onChange={(e) => setDocNotes(e.target.value)}
              placeholder="Maelezo (hiari)"
              className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={addingDoc}
              className="rounded bg-brand-blue px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
            >
              {addingDoc ? "Inaongeza..." : "Ongeza Document"}
            </button>
          </form>
          {docError && (
            <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {docError}
            </p>
          )}
          {documents.length === 0 ? (
            <p className="text-sm text-zinc-500">Hakuna documents bado.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-4">Jina</th>
                  <th className="py-2 pr-4">Aina</th>
                  <th className="py-2 pr-4">Maelezo</th>
                  <th className="py-2 pr-4">Tarehe</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4 font-medium">{d.title}</td>
                    <td className="py-2 pr-4">{d.document_type}</td>
                    <td className="py-2 pr-4">{d.notes ?? "-"}</td>
                    <td className="py-2 pr-4">{d.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "homeVisits" && (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              Historia ya Ziara
            </h2>
            <button
              onClick={() => setShowQuickReport((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors ${
                showQuickReport
                  ? "border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  : "bg-brand-blue text-white hover:bg-brand-blue-dark"
              }`}
            >
              <ClipboardPlus className="h-4 w-4" />
              {showQuickReport ? "Funga" : "Ripoti ya Leo"}
            </button>
          </div>

          {showQuickReport && (
            <form
              onSubmit={onAddQuickReport}
              className="mb-4 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
            >
              <p className="text-xs text-zinc-500">
                Rekodi ripoti/vitals za leo ({new Date().toISOString().slice(0, 10)})
                kwa mgonjwa huyu bila kuondoka ukurasa huu.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Blood Pressure
                  </label>
                  <input
                    value={qrBloodPressure}
                    onChange={(e) => setQrBloodPressure(e.target.value)}
                    placeholder="mf. 120/80"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Temp (°C)
                  </label>
                  <input
                    value={qrTemperature}
                    onChange={(e) => setQrTemperature(e.target.value)}
                    inputMode="decimal"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Pulse
                  </label>
                  <input
                    value={qrPulse}
                    onChange={(e) => setQrPulse(e.target.value)}
                    inputMode="numeric"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Weight (kg)
                  </label>
                  <input
                    value={qrWeight}
                    onChange={(e) => setQrWeight(e.target.value)}
                    inputMode="decimal"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Ripoti ya Matibabu / Taratibu Zilizofanyika (Procedures)
                </label>
                <textarea
                  value={qrTreatmentNotes}
                  onChange={(e) => setQrTreatmentNotes(e.target.value)}
                  rows={3}
                  placeholder="Andika ripoti ya leo na taratibu zilizofanyika kwa mgonjwa..."
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </div>
              {qrError && (
                <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                  {qrError}
                </p>
              )}
              <button
                type="submit"
                disabled={qrSubmitting}
                className="self-start rounded bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {qrSubmitting ? "Inahifadhi..." : "Hifadhi Ripoti ya Leo"}
              </button>
            </form>
          )}

          {homeVisits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 py-10 text-center">
              <Stethoscope className="h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">
                Hakuna ziara/ripoti zilizorekodiwa bado kwa mgonjwa huyu.
              </p>
              {!showQuickReport && (
                <button
                  onClick={() => setShowQuickReport(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-blue-dark"
                >
                  <ClipboardPlus className="h-4 w-4" />
                  Andika Ripoti ya Kwanza
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-4">Tarehe</th>
                  <th className="py-2 pr-4">Nurse</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">BP</th>
                  <th className="py-2 pr-4">Temp</th>
                  <th className="py-2 pr-4">Pulse</th>
                  <th className="py-2 pr-4">Weight</th>
                </tr>
              </thead>
              <tbody>
                {homeVisits.map((v) => (
                  <tr key={v.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/home-visits/${v.id}`}
                        className="font-medium text-zinc-900 underline"
                      >
                        {v.visit_date.slice(0, 10)}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">{v.staff_name ?? "-"}</td>
                    <td className="py-2 pr-4">{v.location ?? "-"}</td>
                    <td className="py-2 pr-4">{v.status}</td>
                    <td className="py-2 pr-4">{v.blood_pressure ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {v.temperature ? `${v.temperature} °C` : "-"}
                    </td>
                    <td className="py-2 pr-4">{v.pulse ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {v.weight ? `${v.weight} kg` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
