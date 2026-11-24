import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { eatToday, listAttendanceForStaffMonth } from "@/lib/repo/attendance";

export const dynamic = "force-dynamic";

/** One staff member's check-ins for ?month=YYYY-MM: for admins, and for themselves. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ staffId: string }> }) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const { staffId } = await params;
  if (session.role !== "ADMIN") {
    const own = await getStaffByUserId(session.id);
    if (!own || own.id !== staffId) {
      return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
    }
  }
  const today = await eatToday();
  const param = req.nextUrl.searchParams.get("month");
  const month = param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : today.slice(0, 7);
  return NextResponse.json({ month, today, rows: await listAttendanceForStaffMonth(staffId, month) });
}
