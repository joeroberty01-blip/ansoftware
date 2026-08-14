import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateDutySchema } from "@/lib/validation/duties";
import { deleteDuty, getDutyById, updateDuty } from "@/lib/repo/duties";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/staff/[id]/duties/[dutyId]">
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

  const { dutyId } = await ctx.params;
  const body = await req.json();
  const parsed = updateDutySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const duty = await updateDuty(dutyId, {
    title: d.title,
    description: d.description === undefined ? undefined : d.description || null,
    status: d.status,
    dueDate: d.dueDate === undefined ? undefined : d.dueDate || null,
  });

  if (!duty) {
    return NextResponse.json({ error: "Jukumu halikupatikana." }, { status: 404 });
  }

  return NextResponse.json({ duty });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/duties/[dutyId]">
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

  const { dutyId } = await ctx.params;
  const existing = await getDutyById(dutyId);
  if (!existing) {
    return NextResponse.json({ error: "Jukumu halikupatikana." }, { status: 404 });
  }

  await deleteDuty(dutyId);
  return NextResponse.json({ ok: true });
}
