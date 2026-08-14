import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addMedicationSchema } from "@/lib/validation/patients";
import { addMedication, listMedications } from "@/lib/repo/patients";
import { assertPatientAccess } from "@/lib/patient-access";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/patients/[id]/medications">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const medications = await listMedications(id);
  return NextResponse.json({ medications });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/patients/[id]/medications">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const body = await req.json();
  const parsed = addMedicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const medication = await addMedication({
    patientId: id,
    medicationName: parsed.data.medicationName,
    dosage: parsed.data.dosage ? parsed.data.dosage : null,
    frequency: parsed.data.frequency ? parsed.data.frequency : null,
    startDate: parsed.data.startDate ? parsed.data.startDate : null,
    endDate: parsed.data.endDate ? parsed.data.endDate : null,
    notes: parsed.data.notes ? parsed.data.notes : null,
  });

  return NextResponse.json({ medication }, { status: 201 });
}
