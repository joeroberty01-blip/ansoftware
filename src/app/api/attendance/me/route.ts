import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import {
  eatToday,
  getForgottenShift,
  getOpenAttendance,
  getShiftStart,
  listAttendanceForStaffToday,
  listPatientsForCheckIn,
} from "@/lib/repo/attendance";

export const dynamic = "force-dynamic";

/** The signed-in staff member's attendance today and whom they may check in for. */
export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json({ staff: null });
  }
  const [open, forgotten, today, patients, shiftStart, date] = await Promise.all([
    getOpenAttendance(staff.id),
    getForgottenShift(staff.id),
    listAttendanceForStaffToday(staff.id),
    listPatientsForCheckIn(staff),
    getShiftStart(),
    eatToday(),
  ]);
  return NextResponse.json({
    staff: { id: staff.id, profession: staff.profession },
    date,
    shiftStart,
    open,
    forgotten,
    today,
    patients,
  });
}
