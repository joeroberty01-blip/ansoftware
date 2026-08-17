import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffById, getStaffJobSummary, getStaffRecentActivity } from "@/lib/repo/staff";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/summary">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  if (session.role !== "ADMIN") {
    const own = await getStaffById(id);
    if (!own || own.user_id !== session.id) {
      return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
    }
  }

  const [summary, activity] = await Promise.all([
    getStaffJobSummary(id),
    getStaffRecentActivity(id),
  ]);

  return NextResponse.json({ summary, activity });
}
