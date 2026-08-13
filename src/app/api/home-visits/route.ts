import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createHomeVisitSchema } from "@/lib/validation/home-visits";
import { createHomeVisit, listHomeVisits } from "@/lib/repo/home-visits";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const patientId = req.nextUrl.searchParams.get("patientId") ?? undefined;
  const staffId = req.nextUrl.searchParams.get("staffId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

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
  const visit = await createHomeVisit({
    patientId: d.patientId,
    staffId: d.staffId ? d.staffId : null,
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
