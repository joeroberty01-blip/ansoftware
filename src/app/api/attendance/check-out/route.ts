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

/** "Naondoka": closes the open shift with GPS. */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json({ error: "Huna wasifu wa Staff." }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Mahali (GPS) hapajapatikana. Washa location kwenye simu, kisha jaribu tena." },
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
    return NextResponse.json({ error: "Imeshindikana. Jaribu tena." }, { status: 500 });
  }
}
