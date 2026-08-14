import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffByUserId } from "@/lib/repo/staff";
import { listDutiesForStaff } from "@/lib/repo/duties";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const staff = await getStaffByUserId(session.id);
  if (!staff) {
    return NextResponse.json({ error: "Huna wasifu wa Staff." }, { status: 404 });
  }

  const duties = await listDutiesForStaff(staff.id);
  return NextResponse.json({ duties });
}
