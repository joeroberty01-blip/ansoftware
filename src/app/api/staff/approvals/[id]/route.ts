import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, updateUserStatus } from "@/lib/repo/users";
import { logAudit } from "@/lib/audit";

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/staff/approvals/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Ruhusa hairuhusiwi." },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const target = await findUserById(id);
  if (!target || target.role !== "STAFF") {
    return NextResponse.json({ error: "Staff hakupatikana." }, { status: 404 });
  }
  if (target.status !== "PENDING") {
    return NextResponse.json(
      { error: "Akaunti hii tayari imeamuliwa." },
      { status: 400 }
    );
  }

  const updated = await updateUserStatus(id, parsed.data.decision);

  await logAudit({
    userId: session.id,
    action: parsed.data.decision === "APPROVED" ? "STAFF_APPROVED" : "STAFF_REJECTED",
    entity: "user",
    entityId: id,
  });

  return NextResponse.json({
    message:
      parsed.data.decision === "APPROVED"
        ? "Staff ameidhinishwa."
        : "Staff amekataliwa.",
    user: { id: updated?.id, status: updated?.status },
  });
}
