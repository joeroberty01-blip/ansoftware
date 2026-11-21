import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }

  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json(
      { error: "You don't have a staff profile." },
      { status: 404 }
    );
  }

  return NextResponse.json({ staff });
}
