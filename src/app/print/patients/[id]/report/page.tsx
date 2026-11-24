import { getCurrentUser } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/patient-access";
import { getPatientById, listMedications } from "@/lib/repo/patients";
import { listHomeVisits, type HomeVisitWithNames } from "@/lib/repo/home-visits";
import {
  DAILY_SESSIONS,
  DAILY_SESSION_LABELS,
  NO_SESSION_LABEL,
  groupDailyReports,
} from "@/lib/daily-reports";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function EntryText({ v }: { v: HomeVisitWithNames }) {
  const vitals = [
    v.blood_pressure ? `BP ${v.blood_pressure} mmHg` : null,
    v.temperature ? `Temp ${v.temperature} °C` : null,
    v.pulse != null ? `Pulse ${v.pulse}` : null,
    v.blood_glucose ? `Glucose ${v.blood_glucose} mmol/L` : null,
    v.spo2 != null ? `SpO₂ ${v.spo2}%` : null,
    v.weight ? `Weight ${v.weight} kg` : null,
  ].filter(Boolean);
  const blocks = [
    { label: "Food Intake", value: v.food_intake },
    { label: "Treatment / Procedures", value: v.treatment_notes },
    { label: "Patient Progress / Notes", value: v.notes },
  ].filter((b) => b.value);
  return (
    <div>
      <p className="text-xs text-zinc-600">
        {v.staff_name ?? "-"}
        {v.location ? ` · ${v.location}` : ""}
      </p>
      <p className="mt-0.5">
        <span className="text-zinc-600">Vitals: </span>
        {vitals.length ? vitals.join("  ·  ") : "Not recorded"}
      </p>
      {blocks.map((b) => (
        <p key={b.label} className="mt-0.5 whitespace-pre-wrap break-words">
          <span className="text-zinc-600">{b.label}: </span>
          {b.value}
        </p>
      ))}
    </div>
  );
}
import { AutoPrint } from "../../../_components/auto-print";

export default async function PatientReportPrintPage(
  props: PageProps<"/print/patients/[id]/report">
) {
  const { id } = await props.params;
  const viewer = await getCurrentUser();
  if (!viewer || (await assertPatientAccess(viewer, id))) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        You don&apos;t have access to this patient&apos;s report.
      </div>
    );
  }

  const patient = await getPatientById(id);

  if (!patient) {
    return <div className="p-6 text-sm text-zinc-500">Not found.</div>;
  }

  const [medications, visits] = await Promise.all([
    listMedications(id),
    listHomeVisits({ patientId: id }),
  ]);

  // One report per day (morning, afternoon, evening), the last 14 days.
  const recentDays = groupDailyReports(visits).slice(0, 14);

  return (
    <div className="mx-auto max-w-[210mm] p-8 text-zinc-900 print:p-0">
      <AutoPrint />
      <style>{`@page { size: A4; margin: 14mm; }`}</style>

      <div className="mb-6 border-b-2 border-brand-blue pb-3">
        <h1 className="text-xl font-bold text-brand-blue">
          Afya Nyumbani Home Care Services Ltd
        </h1>
        <p className="text-sm text-zinc-600">Dar es Salaam, Tanzania</p>
      </div>

      <h2 className="mb-4 text-lg font-bold">
        Patient Care Report
      </h2>

      <div className="mb-6 rounded border border-zinc-300 p-4">
        <h3 className="mb-2 text-base font-semibold">{patient.full_name}</h3>
        <div className="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <span className="text-zinc-600">Gender: </span>
            {patient.gender ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Date of Birth: </span>
            {patient.date_of_birth?.slice(0, 10) ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Phone: </span>
            {patient.phone ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Address: </span>
            {patient.address ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Blood Type: </span>
            {patient.blood_type ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Emergency Contact: </span>
            {patient.emergency_contact_name ?? "-"}
            {patient.emergency_contact_phone
              ? ` (${patient.emergency_contact_phone})`
              : ""}
          </div>
        </div>
        <div className="mt-3 text-sm">
          <span className="text-zinc-600">Allergies: </span>
          <span className="font-medium text-red-700">
            {patient.allergies || "Nothing recorded"}
          </span>
        </div>
        <div className="mt-1 text-sm">
          <span className="text-zinc-600">Chronic Conditions: </span>
          {patient.chronic_conditions || "Nothing recorded"}
        </div>
      </div>

      {medications.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">Medications</h3>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-800">
                <th className="py-1.5 pr-2 font-semibold">Medications</th>
                <th className="py-1.5 pr-2 font-semibold">Dosage</th>
                <th className="py-1.5 pr-2 font-semibold">Frequency</th>
                <th className="py-1.5 pr-2 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((m) => (
                <tr key={m.id} className="border-b border-zinc-200">
                  <td className="py-1.5 pr-2">{m.medication_name}</td>
                  <td className="py-1.5 pr-2">{m.dosage ?? "-"}</td>
                  <td className="py-1.5 pr-2">{m.frequency ?? "-"}</td>
                  <td className="py-1.5 pr-2">
                    {m.start_date?.slice(0, 10) ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold">
          Daily Reports (last {recentDays.length} days)
        </h3>
        {recentDays.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No visits recorded yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentDays.map((day) => {
              const slots = [
                ...DAILY_SESSIONS.map((s) => ({
                  key: s,
                  label: DAILY_SESSION_LABELS[s],
                  entries: day.sessions[s],
                })),
                ...(day.other.length > 0
                  ? [{ key: "other", label: NO_SESSION_LABEL, entries: day.other }]
                  : []),
              ];
              return (
                <div
                  key={day.key}
                  className="break-inside-avoid rounded border border-zinc-300 p-3 text-sm"
                >
                  <p className="border-b border-zinc-200 pb-1.5 font-semibold">
                    {WEEKDAYS[new Date(`${day.date}T00:00:00Z`).getUTCDay()]}, {day.date}
                  </p>
                  {slots.map((slot) => (
                    <div key={slot.key} className="mt-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-zinc-700">
                        {slot.label}
                      </p>
                      {slot.entries.length === 0 ? (
                        <p className="text-xs text-zinc-400">Not filled in.</p>
                      ) : (
                        slot.entries.map((v) => <EntryText key={v.id} v={v} />)
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-10 text-xs text-zinc-400">
        This report was prepared for the patient's family. Afya Nyumbani ERP,{" "}
        {new Date().toISOString().slice(0, 10)}
      </p>
    </div>
  );
}
