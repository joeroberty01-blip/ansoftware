import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAllDocuments } from "@/lib/repo/patients";
import { getStaffByUserId } from "@/lib/repo/staff";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const search = req.nextUrl.searchParams.get("search") ?? undefined;

  let staffId: string | undefined;
  if (session.role !== "ADMIN") {
    const ownStaff = await getStaffByUserId(session.id);
    if (!ownStaff) return NextResponse.json({ documents: [] });
    staffId = ownStaff.id;
  }

  const documents = await listAllDocuments({ staffId, search });
  return NextResponse.json({ documents });
}
