import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getStaffByUserId } from "@/lib/repo/staff";

const schema = z.object({
  kind: z.enum([
    "denied",
    "dismissed",
    "unavailable",
    "unsupported",
    "camera-denied",
    "camera-failed",
    "photo-failed",
    "network",
  ]),
  detail: z.string().max(200).optional(),
  inApp: z.boolean().optional(),
});

/**
 * Notes why a staff member's phone could not check in (no location or photo
 * is sent), so an Admin can see who is stuck and on what in the audit log.
 */
export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  const staff = await getStaffByUserId(session.id);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!staff || !parsed.success) {
    return NextResponse.json({ error: "Invalid data." }, { status: 400 });
  }
  await logAudit({
    userId: session.id,
    action: "ATTENDANCE_PROBLEM",
    entity: "staff_attendance",
    meta: { ...parsed.data, userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null },
  });
  return NextResponse.json({ ok: true });
}
