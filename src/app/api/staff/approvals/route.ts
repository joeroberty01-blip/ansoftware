import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPendingStaff } from "@/lib/repo/users";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Ruhusa hairuhusiwi." },
      { status: 403 }
    );
  }

  const pending = await listPendingStaff();
  return NextResponse.json({
    staff: pending.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      createdAt: u.created_at,
    })),
  });
}
