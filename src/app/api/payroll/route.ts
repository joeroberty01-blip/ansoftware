import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createPayrollSchema } from "@/lib/validation/payroll";
import { createPayrollForStaff, listPayrollHistory } from "@/lib/repo/payroll";
import { getStaffByUserId } from "@/lib/repo/staff";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Staff hakupatikana." },
  ALREADY_EXISTS: {
    status: 400,
    message: "Payroll ya mwezi huu tayari ipo kwa staff huyu.",
  },
};

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  let staffId = req.nextUrl.searchParams.get("staffId") ?? undefined;

  if (session.role !== "ADMIN") {
    const ownStaff = await getStaffByUserId(session.id);
    if (!ownStaff) {
      return NextResponse.json({ error: "Huna wasifu wa Staff." }, { status: 404 });
    }
    staffId = ownStaff.id;
  }

  if (!staffId) {
    return NextResponse.json({ error: "staffId inahitajika." }, { status: 400 });
  }

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : undefined;

  const payrolls = await listPayrollHistory(staffId, year);
  return NextResponse.json({ payrolls });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createPayrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  try {
    const payroll = await createPayrollForStaff({
      ...parsed.data,
      createdById: session.id,
    });
    return NextResponse.json({ payroll }, { status: 201 });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const mapped = ERROR_RESPONSES[code];
    if (mapped) {
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      );
    }
    throw err;
  }
}
