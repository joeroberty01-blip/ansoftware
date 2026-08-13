import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { createLeaveRequestSchema } from "@/lib/validation/leave";
import { createLeaveRequest, listLeaveRequests } from "@/lib/repo/leave";
import { getStaffByUserId } from "@/lib/repo/staff";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  let staffId = req.nextUrl.searchParams.get("staffId") ?? undefined;
  const status = req.nextUrl.searchParams.get("status") ?? undefined;

  if (session.role !== "ADMIN") {
    const ownStaff = await getStaffByUserId(session.id);
    if (!ownStaff) {
      return NextResponse.json({ error: "Huna wasifu wa Staff." }, { status: 404 });
    }
    staffId = ownStaff.id;
  }

  const leaveRequests = await listLeaveRequests({ staffId, status });
  return NextResponse.json({ leaveRequests });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const ownStaff = await getStaffByUserId(session.id);
  if (!ownStaff) {
    return NextResponse.json({ error: "Huna wasifu wa Staff." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createLeaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const start = parseISO(parsed.data.startDate);
  const end = parseISO(parsed.data.endDate);
  const days = differenceInCalendarDays(end, start) + 1;
  if (days < 1) {
    return NextResponse.json(
      { error: "Tarehe ya kumaliza lazima iwe baada ya tarehe ya kuanza." },
      { status: 400 }
    );
  }

  const leaveRequest = await createLeaveRequest({
    staffId: ownStaff.id,
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    days,
    reason: parsed.data.reason,
  });

  return NextResponse.json({ leaveRequest }, { status: 201 });
}
