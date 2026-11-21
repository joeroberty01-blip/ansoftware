import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getStaffByUserId } from "@/lib/repo/staff";
import { AttendanceError, checkOut } from "@/lib/repo/attendance";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().nonnegative().optional(),
});

/** "Check out": closes the open shift with GPS. */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json({ error: "You don't have a staff profile." }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Location (GPS) not found. Turn on location on your phone, then try again." },
      { status: 400 }
    );
  }
  try {
    const row = await checkOut({
      staffId: staff.id,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      accuracyM: parsed.data.accuracy ?? null,
    });
    await logAudit({
      userId: session.id,
      action: "ATTENDANCE_CHECK_OUT",
      entity: "staff_attendance",
      entityId: row.id,
      meta: { distanceM: row.check_out_distance_m },
    }).catch(() => undefined);
    return NextResponse.json({ attendance: row });
  } catch (err) {
    if (err instanceof AttendanceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[attendance] check-out failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
