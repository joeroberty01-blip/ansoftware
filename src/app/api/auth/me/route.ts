import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findUserById } from "@/lib/repo/users";
import { getStaffByUserId } from "@/lib/repo/staff";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const user = await findUserById(session.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const staff = user.role === "ADMIN" ? null : await getStaffByUserId(session.id);

  return NextResponse.json({
    user: {
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isChiefCo: !!staff?.is_chief_co,
    },
  });
}
