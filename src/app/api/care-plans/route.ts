import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createCarePlanSchema } from "@/lib/validation/care-plans";
import { createCarePlan, listCarePlansForPatient } from "@/lib/repo/care-plans";
import { assertPatientAccess } from "@/lib/patient-access";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }

  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId inahitajika." }, { status: 400 });
  }
  if (session.role !== "ADMIN") {
    const denied = await assertPatientAccess(session, patientId);
    if (denied) return denied;
  }

  const carePlans = await listCarePlansForPatient(patientId);
  return NextResponse.json({ carePlans });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createCarePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (session.role !== "ADMIN") {
    const denied = await assertPatientAccess(session, d.patientId);
    if (denied) return denied;
  }

  const carePlan = await createCarePlan({
    patientId: d.patientId,
    staffId: d.staffId ? d.staffId : null,
    frequency: d.frequency,
    weekdays: d.frequency === "WEEKLY" ? d.weekdays ?? null : null,
    sessions: d.sessions,
    startDate: d.startDate,
    endDate: d.endDate,
    notes: d.notes ? d.notes : null,
    createdById: session.id,
  });

  return NextResponse.json({ carePlan }, { status: 201 });
}
