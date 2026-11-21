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
      { error: "Please sign in first." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (id === session.id) {
    return NextResponse.json(
      { error: "You can't deactivate your own account." },
      { status: 400 }
    );
  }

  const staff = await deactivateStaff(id);
  if (!staff) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  return NextResponse.json({ staff });
}
