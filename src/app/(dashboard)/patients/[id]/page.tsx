"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { calculateAge } from "@/lib/date-utils";
import {
  ClipboardPlus,
  User,
  Phone,
  Droplet,
  MapPin,
  UserRound,
  Sun,
  ClipboardList,
  Pencil,
  Printer,
  LogOut,
  Pill,
  FileText,
  Info,
  Heart,
  Home,
  Activity,
  Weight,
  Ruler,
  Shield,
  CalendarClock,
  StickyNote,
  Upload,
  LayoutDashboard,
  Camera,
  ArrowLeft,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

function InfoField({
  icon: Icon,
  label,
  value,
  emptyText = "-",
  emptyIsWarning = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
  emptyText?: string;
  emptyIsWarning?: boolean;
  className?: string;
}) {
  const isEmpty = !value;
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-light text-brand-blue">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p
          className={`font-medium ${
            isEmpty && emptyIsWarning ? "text-red-700" : "text-zinc-900"
          }`}
        >
          {value || emptyText}
        </p>
      </div>
    </div>
  );
}

function parseBloodPressure(
  bp: string | null | undefined
): { systolic: number; diastolic: number } | null {
  if (!bp) return null;
  const m = bp.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!m) return null;
  return { systolic: Number(m[1]), diastolic: Number(m[2]) };
}

function bpStatus(bp: string | null | undefined): "normal" | "warning" | null {
  const parsed = parseBloodPressure(bp);
  if (!parsed) return null;
  const { systolic, diastolic } = parsed;
  return systolic >= 90 && systolic <= 140 && diastolic >= 60 && diastolic <= 90
    ? "normal"
    : "warning";
}

function glucoseStatus(glucose: string | null | undefined): "normal" | "warning" | null {
  if (!glucose) return null;
  const v = Number(glucose);
  if (Number.isNaN(v)) return null;
  return v >= 3.9 && v <= 7.8 ? "normal" : "warning";
}

function bmiStatus(
  weight: string | null | undefined,
  heightCm: string | null | undefined
): "normal" | "warning" | null {
  if (!weight || !heightCm) return null;
  const w = Number(weight);
  const hM = Number(heightCm) / 100;
  if (Number.isNaN(w) || Number.isNaN(hM) || hM <= 0) return null;
  const bmi = w / (hM * hM);
  return bmi >= 18.5 && bmi <= 24.9 ? "normal" : "warning";
}

const VISIT_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Imekamilika", className: "bg-green-100 text-green-700" },
  SCHEDULED: { label: "Imepangwa", className: "bg-brand-blue-light text-brand-blue" },
  CANCELLED: { label: "Imeghairiwa", className: "bg-red-100 text-red-700" },
};

function VisitStatusBadge({ status }: { status: string }) {
  const meta = VISIT_STATUS_LABELS[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

function VitalCard({
  icon: Icon,
  label,
  value,
  unit,
  status,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  status?: "normal" | "warning" | null;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        accent ? "border-brand-orange/30 bg-brand-orange-light/40" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-300" />
      </div>
      <p className="mt-1 text-lg font-bold text-zinc-900">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-zinc-400">{unit}</span>}
      </p>
      {status && (
        <span
          className={`mt-1 inline-flex items-center gap-1 text-[11px] font-medium ${
            status === "normal" ? "text-green-600" : "text-orange-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "normal" ? "bg-green-500" : "bg-orange-500"
            }`}
          />
          {status === "normal" ? "Normal" : "Angalia"}
        </span>
      )}
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  href,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const className = `flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition-colors hover:border-brand-blue/40 hover:bg-brand-blue-light/40 ${
    disabled ? "pointer-events-none opacity-40" : ""
  }`;
  const content = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-blue-light text-brand-blue">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {label}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}

type VitalsChartMetric = "bp" | "sukari" | "uzito" | "temp";

function VitalsTrendChart({
  visits,
  metric,
}: {
  visits: { visit_date: string; blood_pressure: string | null; blood_glucose: string | null; weight: string | null; temperature: string | null }[];
  metric: VitalsChartMetric;
}) {
  const points = visits
    .slice()
    .reverse()
    .map((v) => {
      let value: number | null = null;
      if (metric === "bp") value = parseBloodPressure(v.blood_pressure)?.systolic ?? null;
      else if (metric === "sukari") value = v.blood_glucose ? Number(v.blood_glucose) : null;
      else if (metric === "uzito") value = v.weight ? Number(v.weight) : null;
      else if (metric === "temp") value = v.temperature ? Number(v.temperature) : null;
      return { date: v.visit_date, value };
    })
    .filter((p) => p.value !== null) as { date: string; value: number }[];

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-zinc-400">
        Hakuna data ya kutosha kuchora grafu.
      </p>
    );
  }

  const width = 100;
  const height = 100;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : width / 2;
    const y = height - ((p.value - min) / range) * (height - 10) - 5;
    return { x, y, value: p.value, date: p.date };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <div className="h-32 w-full">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-full w-full">
        <path d={path} fill="none" stroke="var(--color-brand-blue)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r={2} fill="var(--color-brand-blue)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        <span>{coords[0]?.date.slice(5)}</span>
        <span>{coords[coords.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function VitalsChartTabs({
  visits,
}: {
  visits: { visit_date: string; blood_pressure: string | null; blood_glucose: string | null; weight: string | null; temperature: string | null }[];
}) {
  const [metric, setMetric] = useState<VitalsChartMetric>("bp");
  const options: { key: VitalsChartMetric; label: string }[] = [
    { key: "bp", label: "BP" },
    { key: "sukari", label: "Sukari" },
    { key: "uzito", label: "Uzito" },
    { key: "temp", label: "Temp" },
  ];
  return (
    <div>
      <div className="mb-2 flex gap-1">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setMetric(o.key)}
            className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              metric === o.key
                ? "bg-brand-blue text-white"
                : "text-zinc-500 hover:bg-zinc-100"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <VitalsTrendChart visits={visits} metric={metric} />
    </div>
  );
}

interface Patient {
  id: string;
  patient_number: string | null;
  photo_url: string | null;
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
  assigned_staff_id: string | null;
  assigned_staff_name: string | null;
}

interface StaffOption {
  id: string;
  full_name: string;
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
  height_cm: string | null;
  blood_glucose: string | null;
  food_intake: string | null;
  treatment_notes: string | null;
  notes: string | null;
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "overview" | "medications" | "documents" | "homeVisits"
  >("overview");
  const [isAdmin, setIsAdmin] = useState(false);
  const [myStaffId, setMyStaffId] = useState<string | null>(null);
  const [deletingPatient, setDeletingPatient] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => setIsAdmin(json.user?.role === "ADMIN"))
      .catch(() => {});
    fetch("/api/staff/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setMyStaffId(json?.staff?.id ?? null))
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

  // --- Photo upload ---
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/patients/${id}/photo`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        setPhotoError(json.error ?? "Imeshindwa kupakia picha.");
        return;
      }
      setPatient((prev) => (prev ? { ...prev, photo_url: json.patient.photo_url } : prev));
    } catch {
      setPhotoError("Hitilafu ya mtandao.");
    } finally {
      setUploadingPhoto(false);
    }
  };

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
  const [editAssignedStaffId, setEditAssignedStaffId] = useState("");
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/staff")
      .then((r) => r.json())
      .then((json: { staff?: StaffOption[] }) => setStaffOptions(json.staff ?? []))
      .catch(() => {});
  }, [isAdmin]);

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
    setEditAssignedStaffId(patient.assigned_staff_id ?? "");
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
          ...(isAdmin ? { assignedStaffId: editAssignedStaffId || "" } : {}),
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
  const [qrHeightCm, setQrHeightCm] = useState("");
  const [qrBloodGlucose, setQrBloodGlucose] = useState("");
  const [qrFoodIntake, setQrFoodIntake] = useState("");
  const [qrTreatmentNotes, setQrTreatmentNotes] = useState("");
  const [qrNotes, setQrNotes] = useState("");
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
          staffId: myStaffId || undefined,
          visitDate: new Date().toISOString().slice(0, 10),
          status: "COMPLETED",
          location: patient?.address || undefined,
          bloodPressure: qrBloodPressure || undefined,
          temperature: qrTemperature || undefined,
          pulse: qrPulse ? Number(qrPulse) : undefined,
          weight: qrWeight || undefined,
          heightCm: qrHeightCm || undefined,
          bloodGlucose: qrBloodGlucose || undefined,
          foodIntake: qrFoodIntake || undefined,
          treatmentNotes: qrTreatmentNotes || undefined,
          notes: qrNotes || undefined,
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
      setQrHeightCm("");
      setQrBloodGlucose("");
      setQrFoodIntake("");
      setQrTreatmentNotes("");
      setQrNotes("");
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

  const todayStr = new Date().toISOString().slice(0, 10);
  const latestVisit = homeVisits.find((v) => v.status === "COMPLETED") ?? null;
  const activeMedications = medications.filter(
    (m) => !m.end_date || m.end_date >= todayStr
  );
  const upcomingVisit = homeVisits
    .filter((v) => v.status === "SCHEDULED" && v.visit_date >= todayStr)
    .sort((a, b) => a.visit_date.localeCompare(b.visit_date))[0] ?? null;
  const recentVisits = homeVisits.slice(0, 4);

  return (
    <div className="flex max-w-6xl flex-col gap-6 p-6">
      <Link
        href="/patients"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Rudi kwa Wagonjwa
      </Link>
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-brand-blue-light via-white to-white p-5 shadow-sm">
        <Heart
          className="pointer-events-none absolute -top-6 -right-6 h-36 w-36 text-brand-blue/5"
          strokeWidth={1.5}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {patient.photo_url ? (
                <img
                  src={patient.photo_url}
                  alt={patient.full_name}
                  className="h-14 w-14 rounded-full object-cover shadow-sm"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-sm">
                  <User className="h-7 w-7" />
                </span>
              )}
              <label className="absolute -right-1 -bottom-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand-blue text-white shadow-sm">
                <Camera className="h-3 w-3" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onPhotoSelected}
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                  {patient.full_name}
                </h1>
                {patient.gender && (
                  <span className="rounded-full bg-brand-blue-light px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                    {patient.gender}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-500">
                {calculateAge(patient.date_of_birth) !== null
                  ? `${calculateAge(patient.date_of_birth)} years`
                  : "-"}
                {patient.patient_number ? ` · Patient ID: ${patient.patient_number}` : ""}
              </p>
              {photoError && (
                <p className="mt-1 text-xs text-red-600">{photoError}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex shrink-0 gap-2">
              {!editing && (
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Hariri
                </button>
              )}
              <Link
                href={`/print/patients/${id}/report`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Ripoti (kwa Familia)
              </Link>
              {isAdmin && !editing && (
                <button
                  onClick={onDeletePatient}
                  disabled={deletingPatient}
                  className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {deletingPatient ? "Inafuta..." : "Futa"}
                </button>
              )}
            </div>
            {latestVisit && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    bpStatus(latestVisit.blood_pressure) === "warning" ||
                    glucoseStatus(latestVisit.blood_glucose) === "warning"
                      ? "bg-orange-500"
                      : "bg-green-500"
                  }`}
                />
                {bpStatus(latestVisit.blood_pressure) === "warning" ||
                glucoseStatus(latestVisit.blood_glucose) === "warning"
                  ? "Inahitaji Uangalizi"
                  : "Afya Imara"}
                <span className="text-zinc-300">·</span>
                Last updated {latestVisit.visit_date.slice(0, 10)}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={onSavePatient}
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
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
            {isAdmin && (
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-medium text-zinc-600">
                  Nurse Aliyepangiwa (Assigned Nurse)
                </label>
                <select
                  value={editAssignedStaffId}
                  onChange={(e) => setEditAssignedStaffId(e.target.value)}
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                >
                  <option value="">-- hakuna --</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm sm:grid-cols-3">
            <InfoField icon={Phone} label="Simu" value={patient.phone} />
            <InfoField icon={Droplet} label="Blood Type" value={patient.blood_type} />
            <InfoField icon={MapPin} label="Anwani" value={patient.address} />
            <InfoField
              icon={Phone}
              label="Emergency Contact"
              value={
                patient.emergency_contact_name
                  ? `${patient.emergency_contact_name}${
                      patient.emergency_contact_phone
                        ? ` (${patient.emergency_contact_phone})`
                        : ""
                    }`
                  : null
              }
            />
            <InfoField
              icon={UserRound}
              label="Nurse Aliyepangiwa"
              value={patient.assigned_staff_name}
            />
            <InfoField
              icon={Sun}
              label="Mzio (Allergies)"
              value={patient.allergies}
              emptyText="Hakuna kilichorekodiwa"
              emptyIsWarning
            />
            <InfoField
              icon={ClipboardList}
              label="Magonjwa Sugu"
              value={patient.chronic_conditions}
              emptyText="Hakuna kilichorekodiwa"
              emptyIsWarning
              className="col-span-2 sm:col-span-3"
            />
          </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-zinc-200 sm:gap-6">
        {(
          [
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            { key: "medications", label: "Medications", icon: Pill },
            { key: "documents", label: "Documents", icon: FileText },
            { key: "homeVisits", label: "Home Visits", icon: Home },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-1 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-brand-blue text-brand-blue"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <VitalCard
              icon={Activity}
              label="Shinikizo la Damu"
              value={latestVisit?.blood_pressure ?? "-"}
              unit={latestVisit?.blood_pressure ? "mmHg" : undefined}
              status={bpStatus(latestVisit?.blood_pressure)}
            />
            <VitalCard
              icon={Droplet}
              label="Sukari (BS)"
              value={latestVisit?.blood_glucose ?? "-"}
              unit={latestVisit?.blood_glucose ? "mmol/L" : undefined}
              status={glucoseStatus(latestVisit?.blood_glucose)}
            />
            <VitalCard
              icon={Weight}
              label="Uzito"
              value={latestVisit?.weight ?? "-"}
              unit={latestVisit?.weight ? "kg" : undefined}
              status={bmiStatus(latestVisit?.weight, latestVisit?.height_cm)}
            />
            <VitalCard
              icon={Ruler}
              label="Urefu"
              value={latestVisit?.height_cm ?? "-"}
              unit={latestVisit?.height_cm ? "cm" : undefined}
            />
            <VitalCard
              icon={Shield}
              label="Allergies"
              value={patient.allergies || "Hakuna kilichorekodiwa"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-brand-blue" />
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Historia ya Ziara
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setTab("homeVisits");
                      setShowQuickReport(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
                  >
                    <ClipboardPlus className="h-3.5 w-3.5" />
                    Ripoti ya Leo
                  </button>
                </div>

                {recentVisits.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    Hakuna ziara zilizorekodiwa bado.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recentVisits.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-start gap-3 rounded-lg border border-zinc-100 p-3"
                      >
                        <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-brand-blue-light py-1.5 text-brand-blue">
                          <span className="text-sm leading-none font-bold">
                            {v.visit_date.slice(8, 10)}
                          </span>
                          <span className="text-[10px]">{v.visit_date.slice(0, 7)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-900">
                            Ziara ya Afya Nyumbani
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            Nurse: {v.staff_name ?? "-"}
                            {v.blood_pressure ? ` · BP: ${v.blood_pressure} mmHg` : ""}
                            {v.blood_glucose ? ` · Sukari: ${v.blood_glucose} mmol/L` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <VisitStatusBadge status={v.status} />
                          <Link
                            href={`/home-visits/${v.id}`}
                            className="rounded border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Tazama
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {homeVisits.length > 4 && (
                  <button
                    onClick={() => setTab("homeVisits")}
                    className="mt-3 w-full text-center text-xs font-medium text-brand-blue hover:underline"
                  >
                    Tazama Ziara Zote →
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-brand-blue" />
                    <h2 className="text-sm font-semibold text-zinc-900">
                      Dawa Anazotumia Sasa
                    </h2>
                  </div>
                  <button
                    onClick={() => setTab("medications")}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    Tazama Zote
                  </button>
                </div>
                {activeMedications.length === 0 ? (
                  <p className="py-4 text-center text-sm text-zinc-500">
                    Hakuna dawa zinazotumika sasa.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeMedications.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-zinc-100 px-3 py-2"
                      >
                        <p className="text-sm font-medium text-zinc-900">
                          {m.medication_name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {[m.dosage, m.frequency].filter(Boolean).join(" · ") || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand-blue" />
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Mwenendo wa Vitals
                  </h2>
                </div>
                <VitalsChartTabs visits={homeVisits} />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                  <CalendarClock className="h-4 w-4 text-brand-blue" />
                  Ziara Inayofuata
                </h2>
                {upcomingVisit ? (
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {upcomingVisit.visit_date.slice(0, 10)}
                    </p>
                    <p className="mb-2 text-xs text-zinc-500">
                      Nurse: {upcomingVisit.staff_name ?? "-"}
                    </p>
                    <VisitStatusBadge status={upcomingVisit.status} />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">Hakuna ziara iliyopangwa.</p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-zinc-900">
                  Vitendo vya Haraka
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  <QuickActionButton
                    icon={ClipboardPlus}
                    label="Ripoti ya Leo"
                    onClick={() => {
                      setTab("homeVisits");
                      setShowQuickReport(true);
                    }}
                  />
                  <QuickActionButton
                    icon={Pill}
                    label="Ongeza Dawa"
                    onClick={() => setTab("medications")}
                  />
                  <QuickActionButton
                    icon={CalendarClock}
                    label="Panga Ziara"
                    href={`/home-visits/new?patientId=${id}`}
                  />
                  <QuickActionButton
                    icon={Phone}
                    label="Piga Simu"
                    href={patient.phone ? `tel:${patient.phone}` : undefined}
                    disabled={!patient.phone}
                  />
                  <QuickActionButton
                    icon={StickyNote}
                    label="Ongeza Note"
                    onClick={startEditing}
                  />
                  <QuickActionButton
                    icon={Upload}
                    label="Pakia Document"
                    onClick={() => setTab("documents")}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900">Nyaraka</h2>
                  <button
                    onClick={() => setTab("documents")}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    Tazama Zote
                  </button>
                </div>
                {documents.length === 0 ? (
                  <p className="text-sm text-zinc-500">Hakuna nyaraka bado.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {documents.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 rounded-lg border border-zinc-100 px-3 py-2"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {d.title}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {d.document_type} · {d.created_at.slice(0, 10)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-brand-blue-light/60 px-3 py-2.5 text-xs text-brand-blue">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Vidokezo: Kila ziara inasaidia kufuatilia maendeleo ya mgonjwa na
              kuboresha huduma zinazotolewa.
            </p>
          </div>
        </div>
      )}

      {tab === "medications" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
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
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
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
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
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
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-light text-brand-blue">
                <Home className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Historia ya Ziara
                </h2>
                <p className="text-xs text-zinc-500">
                  Angalia na simamia historia ya ziara za mgonjwa nyumbani.
                </p>
              </div>
            </div>
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Sukari / Blood Glucose
                  </label>
                  <input
                    value={qrBloodGlucose}
                    onChange={(e) => setQrBloodGlucose(e.target.value)}
                    inputMode="decimal"
                    placeholder="mf. 5.5"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">
                    Urefu (cm)
                  </label>
                  <input
                    value={qrHeightCm}
                    onChange={(e) => setQrHeightCm(e.target.value)}
                    inputMode="decimal"
                    placeholder="mf. 170"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Chakula / Ulishaji (Food Intake)
                </label>
                <input
                  value={qrFoodIntake}
                  onChange={(e) => setQrFoodIntake(e.target.value)}
                  placeholder="mf. Alikula ugali na mboga, kikombe 1 cha chai..."
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Taratibu Zilizofanyika (Procedures)
                </label>
                <textarea
                  value={qrTreatmentNotes}
                  onChange={(e) => setQrTreatmentNotes(e.target.value)}
                  rows={3}
                  placeholder="mf. Alibadilishiwa bandage, alipimwa sukari, alipewa dawa X..."
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">
                  Maendeleo ya Mgonjwa / Maelezo Mengine (Progress Notes)
                </label>
                <textarea
                  value={qrNotes}
                  onChange={(e) => setQrNotes(e.target.value)}
                  rows={3}
                  placeholder="mf. Hali ya mgonjwa leo, maumivu, hamu ya kula, usingizi, mabadiliko yoyote..."
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
                className="self-start rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark disabled:opacity-50"
              >
                {qrSubmitting ? "Inahifadhi..." : "Hifadhi Ripoti ya Leo"}
              </button>
            </form>
          )}

          {homeVisits.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-zinc-200 bg-zinc-50/50 py-12 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue-light text-brand-blue">
                <ClipboardPlus className="h-8 w-8" />
              </span>
              <p className="text-sm font-semibold text-zinc-900">
                Hakuna ziara/ripoti zilizorekodiwa bado kwa mgonjwa huyu.
              </p>
              <p className="max-w-sm text-xs text-zinc-500">
                Anza kwa kuongeza ripoti mpya ya ziara ya mgonjwa nyumbani.
              </p>
              {!showQuickReport && (
                <button
                  onClick={() => setShowQuickReport(true)}
                  className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-dark"
                >
                  <ClipboardPlus className="h-4 w-4" />
                  Andika Ripoti ya Kwanza
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-4">Tarehe</th>
                  <th className="py-2 pr-4">Nurse</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">BP</th>
                  <th className="py-2 pr-4">Temp</th>
                  <th className="py-2 pr-4">Pulse</th>
                  <th className="py-2 pr-4">Weight</th>
                  <th className="py-2 pr-4">Sukari</th>
                  <th className="py-2 pr-4">Chakula</th>
                  <th className="py-2 pr-4">Taratibu</th>
                  <th className="py-2 pr-4">Maendeleo</th>
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
                    <td className="py-2 pr-4">
                      {v.blood_glucose ? `${v.blood_glucose} mmol/L` : "-"}
                    </td>
                    <td
                      className="max-w-[140px] truncate py-2 pr-4"
                      title={v.food_intake ?? undefined}
                    >
                      {v.food_intake ?? "-"}
                    </td>
                    <td
                      className="max-w-[160px] truncate py-2 pr-4"
                      title={v.treatment_notes ?? undefined}
                    >
                      {v.treatment_notes ?? "-"}
                    </td>
                    <td
                      className="max-w-[160px] truncate py-2 pr-4"
                      title={v.notes ?? undefined}
                    >
                      {v.notes ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-blue-light/60 px-3 py-2.5 text-xs text-brand-blue">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Vidokezo: Kila ziara inasaidia kufuatilia maendeleo ya mgonjwa na
              kuboresha huduma zinazotolewa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
