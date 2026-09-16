import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateCarePlanSchema } from "@/lib/validation/care-plans";
import { getCarePlanById, updateCarePlanStatus } from "@/lib/repo/care-plans";
import { assertPatientAccess } from "@/lib/patient-access";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/care-plans/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const carePlan = await getCarePlanById(id);
  if (!carePlan) {
    return NextResponse.json({ error: "Care plan haikupatikana." }, { status: 404 });
  }
  const denied = await assertPatientAccess(session, carePlan.patient_id);
  if (denied) return denied;

  return NextResponse.json({ carePlan });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/care-plans/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await getCarePlanById(id);
  if (!existing) {
    return NextResponse.json({ error: "Care plan haikupatikana." }, { status: 404 });
  }
  const denied = await assertPatientAccess(session, existing.patient_id);
  if (denied) return denied;

  const body = await req.json();
  const parsed = updateCarePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }
  const d = parsed.data;

  if (d.staffId !== undefined) {
    await query(`UPDATE care_plans SET staff_id = $2, updated_at = now() WHERE id = $1`, [
      id,
      d.staffId || null,
    ]);
  }
  const carePlan = d.status
    ? await updateCarePlanStatus(id, d.status)
    : await getCarePlanById(id);

  return NextResponse.json({ carePlan });
}
