import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfitAndLoss } from "@/lib/repo/financial-statements";

function isValidDate(value: string | null): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

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

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const from = isValidDate(fromParam) ? fromParam : monthStart;
  // `to` is exclusive in the underlying query, so push it one day past the
  // requested end date to include that whole day.
  const toInclusive = isValidDate(toParam) ? toParam : today;
  const to = new Date(new Date(toInclusive).getTime() + 86_400_000)
    .toISOString()
    .slice(0, 10);

  const pnl = await getProfitAndLoss(from, to);
  return NextResponse.json({ pnl: { ...pnl, to: toInclusive } });
}
