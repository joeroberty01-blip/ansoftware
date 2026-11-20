import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { getAttendanceById, getAttendancePhoto } from "@/lib/repo/attendance";

/** The check-in selfie: for admins, and for the staff member who took it. */
export async function GET(_req: Request, ctx: RouteContext<"/api/attendance/[id]/photo">) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const attendance = await getAttendanceById(id);
  if (!attendance) {
    return NextResponse.json({ error: "Haikupatikana." }, { status: 404 });
  }
  if (session.role !== "ADMIN") {
    const staff = await getStaffByUserId(session.id);
    if (!staff || staff.id !== attendance.staff_id) {
      return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
    }
  }
  const photo = await getAttendancePhoto(id);
  if (!photo) {
    return NextResponse.json({ error: "Hakuna picha." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
