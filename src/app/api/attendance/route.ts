import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { NEAR_HOME_METERS } from "@/lib/geo";
import {
  eatToday,
  getMonthlySummary,
  getShiftStart,
  listAttendanceByDate,
  listStaffWithoutCheckIn,
  setShiftStart,
} from "@/lib/repo/attendance";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getCurrentUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };
  }
  if (session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 }) };
  }
  return { session };
}

/**
 * Admin: ?date=YYYY-MM-DD gives that day's check-ins and who did not check
 * in; ?month=YYYY-MM gives one line per staff member for the month.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const month = req.nextUrl.searchParams.get("month");
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const summary = await getMonthlySummary(y, m, NEAR_HOME_METERS);
    return NextResponse.json({ month, summary, nearMeters: NEAR_HOME_METERS });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : await eatToday();
  const [rows, missing, shiftStart] = await Promise.all([
    listAttendanceByDate(date),
    listStaffWithoutCheckIn(date),
    getShiftStart(),
  ]);
  return NextResponse.json({ date, rows, missing, shiftStart, nearMeters: NEAR_HOME_METERS });
}

const settingsSchema = z.object({
  shiftStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time (e.g. 07:00)"),
});

/** Admin: set the shift start used to count lateness. */
export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const parsed = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  await setShiftStart(parsed.data.shiftStart);
  return NextResponse.json({ shiftStart: parsed.data.shiftStart });
}
