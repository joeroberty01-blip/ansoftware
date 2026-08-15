import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFinanceSummary, type FinancePeriod } from "@/lib/repo/finance";
import { getExpenseCategoryBreakdown } from "@/lib/repo/expenses";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const periodParam = req.nextUrl.searchParams.get("period");
  const period: FinancePeriod =
    periodParam === "today" || periodParam === "week" ? periodParam : "month";

  const { from, to } = await getFinanceSummary(period);
  const breakdown = await getExpenseCategoryBreakdown(from, to);
  return NextResponse.json({ from, to, breakdown });
}
