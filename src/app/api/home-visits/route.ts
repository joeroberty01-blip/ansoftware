import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createHomeVisitSchema } from "@/lib/validation/home-visits";
import { createHomeVisit, listHomeVisits } from "@/lib/repo/home-visits";
import { assertPatientAccess } from "@/lib/patient-access";
import { getStaffByUserId } from "@/lib/repo/staff";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const patientId = req.nextUrl.searchParams.get("patientId") ?? undefined;
  let staffId = req.nextUrl.searchParams.get("staffId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  if (session.role !== "ADMIN") {
    if (patientId) {
      const denied = await assertPatientAccess(session, patientId);
      if (denied) return denied;
    } else {
      // Browsing the general list (no specific patient) — scope to visits
      // this staff member performed themselves.
      const ownStaff = await getStaffByUserId(session.id);
      if (!ownStaff) return NextResponse.json({ visits: [] });
      staffId = ownStaff.id;
    }
  }

  const visits = await listHomeVisits({ patientId, staffId, status });
  return NextResponse.json({ visits });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createHomeVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;

  let staffId = d.staffId ? d.staffId : null;
  if (session.role !== "ADMIN") {
    const denied = await assertPatientAccess(session, d.patientId);
    if (denied) return denied;
    // Staff always file reports under their own name, never on behalf of
    // someone else.
    const ownStaff = await getStaffByUserId(session.id);
    staffId = ownStaff?.id ?? null;
  }

  const visit = await createHomeVisit({
    patientId: d.patientId,
    staffId,
    visitDate: d.visitDate,
    status: d.status,
    location: d.location ? d.location : null,
    bloodPressure: d.bloodPressure ? d.bloodPressure : null,
    temperature: d.temperature ? d.temperature : null,
    pulse: d.pulse ?? null,
    weight: d.weight ? d.weight : null,
    treatmentNotes: d.treatmentNotes ? d.treatmentNotes : null,
    notes: d.notes ? d.notes : null,
    createdById: session.id,
  });

  return NextResponse.json({ visit }, { status: 201 });
}
