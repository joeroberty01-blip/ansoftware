import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updatePatientSchema } from "@/lib/validation/patients";
import { getPatientById, updatePatient } from "@/lib/repo/patients";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/patients/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const patient = await getPatientById(id);
  if (!patient) {
    return NextResponse.json({ error: "Mgonjwa hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ patient });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/patients/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const patient = await updatePatient(id, {
    fullName: d.fullName,
    dateOfBirth: d.dateOfBirth === undefined ? undefined : d.dateOfBirth || null,
    gender: d.gender,
    phone: d.phone === undefined ? undefined : d.phone || null,
    email: d.email === undefined ? undefined : d.email || null,
    address: d.address === undefined ? undefined : d.address || null,
    emergencyContactName:
      d.emergencyContactName === undefined ? undefined : d.emergencyContactName || null,
    emergencyContactPhone:
      d.emergencyContactPhone === undefined ? undefined : d.emergencyContactPhone || null,
    bloodType: d.bloodType === undefined ? undefined : d.bloodType || null,
    allergies: d.allergies === undefined ? undefined : d.allergies || null,
    chronicConditions:
      d.chronicConditions === undefined ? undefined : d.chronicConditions || null,
    notes: d.notes === undefined ? undefined : d.notes || null,
  });

  if (!patient) {
    return NextResponse.json({ error: "Mgonjwa hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ patient });
}
