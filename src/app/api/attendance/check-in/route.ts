import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertPatientAccess } from "@/lib/patient-access";
import { getStaffByUserId } from "@/lib/repo/staff";
import { AttendanceError, checkIn } from "@/lib/repo/attendance";

export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 800 * 1024;

function num(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "Check in": opens a shift with GPS and a selfie. Multipart form. */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json({ error: "You don't have a staff profile." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }

  const patientId = form.get("patientId");
  const lat = num(form.get("lat"));
  const lng = num(form.get("lng"));
  const accuracy = num(form.get("accuracy"));
  const photo = form.get("photo");

  if (typeof patientId !== "string" || !patientId) {
    return NextResponse.json({ error: "Select the patient you've arrived at." }, { status: 400 });
  }
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json(
      { error: "Location (GPS) not found. Turn on location on your phone, then tap \"Get location\"." },
      { status: 400 }
    );
  }
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "Take a selfie first." }, { status: 400 });
  }
  if (!photo.type.startsWith("image/")) {
    return NextResponse.json({ error: "The selfie must be a photo." }, { status: 400 });
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "The photo is too large. Please try again." }, { status: 413 });
  }

  const denied = await assertPatientAccess(session, patientId);
  if (denied) return denied;

  try {
    const row = await checkIn({
      staffId: staff.id,
      patientId,
      lat,
      lng,
      accuracyM: accuracy,
      photo: { mime: photo.type, data: Buffer.from(await photo.arrayBuffer()) },
      userAgent: req.headers.get("user-agent"),
    });
    await logAudit({
      userId: session.id,
      action: "ATTENDANCE_CHECK_IN",
      entity: "staff_attendance",
      entityId: row.id,
      meta: { patientId, distanceM: row.check_in_distance_m, lateMinutes: row.late_minutes },
    }).catch(() => undefined);
    return NextResponse.json({ attendance: row }, { status: 201 });
  } catch (err) {
    if (err instanceof AttendanceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[attendance] check-in failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
