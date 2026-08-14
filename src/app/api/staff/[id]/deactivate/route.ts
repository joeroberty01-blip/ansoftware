import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deactivateStaff } from "@/lib/repo/staff";

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/deactivate">
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
  if (id === session.id) {
    return NextResponse.json(
      { error: "Huwezi kuzima akaunti yako mwenyewe." },
      { status: 400 }
    );
  }

  const staff = await deactivateStaff(id);
  if (!staff) {
    return NextResponse.json({ error: "Staff hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ staff });
}
