import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPatientSchema } from "@/lib/validation/patients";
import { createPatient, listPatients } from "@/lib/repo/patients";
import { getStaffByUserId } from "@/lib/repo/staff";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const assignedToMe = req.nextUrl.searchParams.get("assignedToMe") === "true";

  let assignedStaffId: string | undefined;
  if (session.role !== "ADMIN") {
    // Staff can only ever see patients assigned to them — not an optional
    // filter, always enforced regardless of the assignedToMe query param.
    const ownStaff = await getStaffByUserId(session.id);
    if (!ownStaff) {
      return NextResponse.json({ patients: [] });
    }
    assignedStaffId = ownStaff.id;
  } else if (assignedToMe) {
    const ownStaff = await getStaffByUserId(session.id);
    if (!ownStaff) {
      return NextResponse.json({ patients: [] });
    }
    assignedStaffId = ownStaff.id;
  }

  const patients = await listPatients({ search, assignedStaffId });
  return NextResponse.json({ patients });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Ruhusa hairuhusiwi. Wasiliana na Admin kusajili mgonjwa mpya." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const patient = await createPatient({
    fullName: d.fullName,
    dateOfBirth: d.dateOfBirth ? d.dateOfBirth : null,
    gender: d.gender ? d.gender : null,
    phone: d.phone ? d.phone : null,
    email: d.email ? d.email : null,
    address: d.address ? d.address : null,
    emergencyContactName: d.emergencyContactName ? d.emergencyContactName : null,
    emergencyContactPhone: d.emergencyContactPhone ? d.emergencyContactPhone : null,
    bloodType: d.bloodType ? d.bloodType : null,
    allergies: d.allergies ? d.allergies : null,
    chronicConditions: d.chronicConditions ? d.chronicConditions : null,
    notes: d.notes ? d.notes : null,
    createdById: session.id,
  });

  return NextResponse.json({ patient }, { status: 201 });
}
