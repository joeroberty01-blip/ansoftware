import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReportsOverview } from "@/lib/repo/reports";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
  }

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : 30;

  const overview = await getReportsOverview(
    Number.isFinite(days) && days > 0 ? days : 30
  );
  return NextResponse.json({ overview });
}
