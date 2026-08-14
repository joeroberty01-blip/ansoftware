import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation/settings";
import { findUserById, updateUserPassword } from "@/lib/repo/users";

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const user = await findUserById(session.id);
  if (!user) {
    return NextResponse.json({ error: "Mtumiaji hakupatikana." }, { status: 404 });
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json(
      { error: "Password ya sasa sio sahihi." },
      { status: 400 }
    );
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await updateUserPassword(session.id, newHash);

  return NextResponse.json({ message: "Password imebadilishwa kikamilifu." });
}
