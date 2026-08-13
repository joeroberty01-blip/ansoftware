import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateHomeVisitSchema } from "@/lib/validation/home-visits";
import { getHomeVisitById, updateHomeVisit } from "@/lib/repo/home-visits";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/home-visits/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const visit = await getHomeVisitById(id);
  if (!visit) {
    return NextResponse.json({ error: "Home visit haikupatikana." }, { status: 404 });
  }

  return NextResponse.json({ visit });
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/home-visits/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateHomeVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const visit = await updateHomeVisit(id, {
    status: d.status,
    location: d.location === undefined ? undefined : d.location || null,
    bloodPressure: d.bloodPressure === undefined ? undefined : d.bloodPressure || null,
    temperature: d.temperature === undefined ? undefined : d.temperature || null,
    pulse: d.pulse,
    weight: d.weight === undefined ? undefined : d.weight || null,
    treatmentNotes:
      d.treatmentNotes === undefined ? undefined : d.treatmentNotes || null,
    notes: d.notes === undefined ? undefined : d.notes || null,
  });

  if (!visit) {
    return NextResponse.json({ error: "Home visit haikupatikana." }, { status: 404 });
  }

  return NextResponse.json({ visit });
}
