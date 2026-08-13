import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listLowStockItems, listExpiringBatches } from "@/lib/repo/inventory";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const withinDaysParam = req.nextUrl.searchParams.get("withinDays");
  const withinDays = withinDaysParam ? parseInt(withinDaysParam, 10) : 60;

  const [lowStock, expiring] = await Promise.all([
    listLowStockItems(),
    listExpiringBatches(withinDays),
  ]);

  return NextResponse.json({ lowStock, expiring });
}
