import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { setPatientHomeFromAttendance } from "@/lib/repo/attendance";

/** Admin: "this check-in was at the patient's home" saves it as the home location. */
export async function POST(_req: Request, ctx: RouteContext<"/api/attendance/[id]/set-home">) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const result = await setPatientHomeFromAttendance(id, session.id);
  if (!result) {
    return NextResponse.json({ error: "Check-in hii haina mgonjwa." }, { status: 404 });
  }
  await logAudit({
    userId: session.id,
    action: "PATIENT_HOME_LOCATION_SET",
    entity: "patient",
    entityId: result.patientId,
    meta: { fromAttendanceId: id },
  }).catch(() => undefined);
  return NextResponse.json({ ok: true, patientId: result.patientId });
}
