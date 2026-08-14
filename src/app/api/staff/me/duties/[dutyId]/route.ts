import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { getDutyById, updateDuty } from "@/lib/repo/duties";
import { DUTY_STATUSES } from "@/lib/validation/duties";

const selfUpdateSchema = z.object({ status: z.enum(DUTY_STATUSES) });

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/staff/me/duties/[dutyId]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json({ error: "Huna wasifu wa Staff." }, { status: 404 });
  }

  const { dutyId } = await ctx.params;
  const existing = await getDutyById(dutyId);
  if (!existing || existing.staff_id !== staff.id) {
    return NextResponse.json({ error: "Jukumu halikupatikana." }, { status: 404 });
  }

  const body = await req.json();
  const parsed = selfUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const duty = await updateDuty(dutyId, { status: parsed.data.status });
  return NextResponse.json({ duty });
}
