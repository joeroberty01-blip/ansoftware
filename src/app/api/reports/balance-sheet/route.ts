import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBalanceSheet } from "@/lib/repo/financial-statements";

function isValidDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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

  const asOfParam = req.nextUrl.searchParams.get("asOf");
  const asOf = isValidDate(asOfParam)
    ? asOfParam
    : new Date().toISOString().slice(0, 10);

  const balanceSheet = await getBalanceSheet(asOf);
  return NextResponse.json({ balanceSheet });
}
