import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findUserById } from "@/lib/repo/users";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const user = await findUserById(session.id);
  if (!user) {
    return NextResponse.json({ error: "Mtumiaji hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      fullName: user.full_name,
      email: user.email,
      role: user.role,
      phone: user.phone,
    },
  });
}
