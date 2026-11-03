import { getPatientById, listMedications } from "@/lib/repo/patients";
import { listHomeVisits } from "@/lib/repo/home-visits";
import { AutoPrint } from "../../../_components/auto-print";

export default async function PatientReportPrintPage(
  props: PageProps<"/print/patients/[id]/report">
) {
  const { id } = await props.params;
  const patient = await getPatientById(id);

  if (!patient) {
    return <div className="p-6 text-sm text-zinc-500">Haikupatikana.</div>;
  }

  const [medications, visits] = await Promise.all([
    listMedications(id),
    listHomeVisits({ patientId: id }),
  ]);

  const recentVisits = visits.slice(0, 30);

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
        Ripoti ya Huduma ya Mgonjwa (Patient Care Report)
      </h2>

      <div className="mb-6 rounded border border-zinc-300 p-4">
        <h3 className="mb-2 text-base font-semibold">{patient.full_name}</h3>
        <div className="grid grid-cols-2 gap-y-1 text-sm sm:grid-cols-3">
          <div>
            <span className="text-zinc-600">Jinsia: </span>
            {patient.gender ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Tarehe ya Kuzaliwa: </span>
            {patient.date_of_birth?.slice(0, 10) ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Simu: </span>
            {patient.phone ?? "-"}
          </div>
          <div>
            <span className="text-zinc-600">Anwani: </span>
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
          <span className="text-zinc-600">Mzio (Allergies): </span>
          <span className="font-medium text-red-700">
            {patient.allergies || "Nothing recorded"}
          </span>
        </div>
        <div className="mt-1 text-sm">
          <span className="text-zinc-600">Magonjwa Sugu: </span>
          {patient.chronic_conditions || "Nothing recorded"}
        </div>
      </div>

      {medications.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">Dawa (Medications)</h3>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-800">
                <th className="py-1.5 pr-2 font-semibold">Dawa</th>
                <th className="py-1.5 pr-2 font-semibold">Dosage</th>
                <th className="py-1.5 pr-2 font-semibold">Frequency</th>
                <th className="py-1.5 pr-2 font-semibold">Ilianza</th>
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
          Ripoti za Ziara za Nyumbani (Ziara {recentVisits.length} za Hivi Karibuni)
        </h3>
        {recentVisits.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Hakuna ziara zilizorekodiwa bado.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentVisits.map((v) => {
              const vitals = [
                v.blood_pressure ? `BP ${v.blood_pressure} mmHg` : null,
                v.temperature ? `Joto ${v.temperature} °C` : null,
                v.pulse != null ? `Pulse ${v.pulse}` : null,
                v.blood_glucose ? `Sukari ${v.blood_glucose} mmol/L` : null,
                v.spo2 != null ? `SpO₂ ${v.spo2}%` : null,
                v.weight ? `Uzito ${v.weight} kg` : null,
              ].filter(Boolean);
              const blocks = [
                { label: "Chakula", value: v.food_intake },
                { label: "Matibabu / Procedures", value: v.treatment_notes },
                { label: "Maendeleo ya Mgonjwa / Maelezo", value: v.notes },
              ].filter((b) => b.value);
              return (
                <div
                  key={v.id}
                  className="break-inside-avoid rounded border border-zinc-300 p-3 text-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2 border-b border-zinc-200 pb-1.5">
                    <span className="font-semibold">
                      {v.visit_date.slice(0, 10)}
                      {v.visit_session
                        ? ` — ${{ MORNING: "Asubuhi", AFTERNOON: "Mchana", EVENING: "Jioni" }[v.visit_session]}`
                        : ""}
                    </span>
                    <span className="text-zinc-600">
                      {v.staff_name ?? "-"}
                      {v.location ? ` · ${v.location}` : ""}
                    </span>
                  </div>
                  <p className="mt-1.5">
                    <span className="text-zinc-600">Vitals: </span>
                    {vitals.length ? vitals.join("  ·  ") : "Hazikurekodiwa"}
                  </p>
                  {blocks.map((b) => (
                    <p key={b.label} className="mt-1 whitespace-pre-wrap break-words">
                      <span className="text-zinc-600">{b.label}: </span>
                      {b.value}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-10 text-xs text-zinc-400">
        Ripoti hii imetengenezwa kwa ajili ya familia ya mgonjwa — Afya Nyumbani ERP —{" "}
        {new Date().toISOString().slice(0, 10)}
      </p>
    </div>
  );
}
