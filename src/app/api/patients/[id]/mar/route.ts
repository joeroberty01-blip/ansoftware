import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertPatientAccess } from "@/lib/patient-access";
import {
  clinicToday,
  getMarDay,
  getMarHistory,
  recordAdministration,
} from "@/lib/repo/mar";
import { marDateSchema, recordMarSchema } from "@/lib/validation/mar";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/patients/[id]/mar">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const today = await clinicToday();
  const dateParam = req.nextUrl.searchParams.get("date") ?? today;
  const date = marDateSchema.safeParse(dateParam);
  if (!date.success) {
    return NextResponse.json({ error: date.error.issues[0].message }, { status: 400 });
  }

  const [day, history] = await Promise.all([
    getMarDay(id, date.data),
    getMarHistory(id, 14),
  ]);
  return NextResponse.json({ ...day, today, history });
}

export async function PUT(
  req: Request,
  ctx: RouteContext<"/api/patients/[id]/mar">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const parsed = recordMarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  if (d.date > (await clinicToday())) {
    return NextResponse.json(
      { error: "Huwezi kurekodi dawa ya siku ijayo." },
      { status: 400 }
    );
  }

  try {
    await recordAdministration({
      patientId: id,
      medicationId: d.medicationId,
      date: d.date,
      slot: d.slot,
      status: d.status,
      givenTime: d.givenTime ? d.givenTime : null,
      notes: d.notes ? d.notes : null,
      userId: session.id,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "MEDICATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Dawa hii haipo kwa siku/muda huu." },
        { status: 404 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
