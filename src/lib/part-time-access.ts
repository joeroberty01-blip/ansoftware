import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import { getStaffByUserId } from "./repo/staff";
import type { SessionUser } from "./types";

/** Part-time visits are recorded and read by an Admin or the Chief C.O only. */
export async function canManagePartTime(user: SessionUser): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const staff = await getStaffByUserId(user.id);
  return !!staff?.is_chief_co;
}

/** API guard for the part-time visits routes. */
export async function requirePartTimeAccess(): Promise<
  { session: SessionUser; error?: undefined } | { error: NextResponse; session?: undefined }
> {
  const session = await getCurrentUser();
  if (!session) {
    return { error: NextResponse.json({ error: "Please sign in first." }, { status: 401 }) };
  }
  if (!(await canManagePartTime(session))) {
    return {
      error: NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 }),
    };
  }
  return { session };
}
