import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { getStaffById } from "@/lib/repo/staff";
import { updateUserPassword } from "@/lib/repo/users";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CHARS[randomInt(CHARS.length)];
  }
  return out;
}

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/reset-password">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "You need to sign in first." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Permission denied." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const staff = await getStaffById(id);
  if (!staff) {
    return NextResponse.json({ error: "Staff not found." }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  await updateUserPassword(staff.user_id, hash);

  // The plaintext password is returned exactly once, to the admin who just
  // triggered the reset — it is never stored or logged anywhere.
  return NextResponse.json({ temporaryPassword: tempPassword });
}
