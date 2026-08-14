import { NextResponse } from "next/server";
import type { SessionUser } from "./types";
import { getStaffByUserId } from "./repo/staff";
import { getPatientById } from "./repo/patients";

/**
 * Staff may only view/edit patients assigned to them; Admins can access any
 * patient. Returns a ready-to-return 403/404 NextResponse if access should
 * be denied, or null if the caller may proceed.
 */
export async function assertPatientAccess(
  session: SessionUser,
  patientId: string
): Promise<NextResponse | null> {
  if (session.role === "ADMIN") return null;

  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json({ error: "Huna wasifu wa Staff." }, { status: 403 });
  }

  const patient = await getPatientById(patientId);
  if (!patient) {
    return NextResponse.json({ error: "Mgonjwa hakupatikana." }, { status: 404 });
  }

  if (patient.assigned_staff_id !== staff.id) {
    return NextResponse.json(
      { error: "Huna ruhusa kwa mgonjwa huyu — hajapangiwa kwako." },
      { status: 403 }
    );
  }

  return null;
}
