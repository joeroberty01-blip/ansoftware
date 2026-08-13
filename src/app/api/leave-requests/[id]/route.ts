import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { decideLeaveRequestSchema } from "@/lib/validation/leave";
import { decideLeaveRequest } from "@/lib/repo/leave";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Ombi la likizo halikupatikana." },
  ALREADY_DECIDED: {
    status: 400,
    message: "Ombi hili tayari limeamuliwa.",
  },
  INSUFFICIENT_BALANCE: {
    status: 400,
    message: "Staff huyu hana siku za kutosha za likizo kwa ombi hili.",
  },
};

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/leave-requests/[id]">
) {
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

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = decideLeaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  try {
    const leaveRequest = await decideLeaveRequest(
      id,
      parsed.data.decision,
      session.id,
      parsed.data.decisionNote ? parsed.data.decisionNote : null
    );
    return NextResponse.json({ leaveRequest });
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
