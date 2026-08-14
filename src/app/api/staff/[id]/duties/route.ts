import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDutySchema } from "@/lib/validation/duties";
import { createDuty, listDutiesForStaff } from "@/lib/repo/duties";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/duties">
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
  const duties = await listDutiesForStaff(id);
  return NextResponse.json({ duties });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/staff/[id]/duties">
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
  const parsed = createDutySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const duty = await createDuty({
    staffId: id,
    title: d.title,
    description: d.description ? d.description : null,
    dueDate: d.dueDate ? d.dueDate : null,
    assignedById: session.id,
  });

  return NextResponse.json({ duty }, { status: 201 });
}
