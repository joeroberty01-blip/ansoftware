import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { eatToday } from "@/lib/repo/attendance";
import { requirePartTimeAccess } from "@/lib/part-time-access";
import {
  createPartTimeVisit,
  listPartTimeOptions,
  listPartTimeVisits,
  PartTimeVisitError,
} from "@/lib/repo/part-time-visits";
import { partTimeVisitSchema } from "@/lib/validation/part-time-visits";

export const dynamic = "force-dynamic";

/** ?month=YYYY-MM (default: this month) gives the visits plus the form choices. */
export async function GET(req: NextRequest) {
  const auth = await requirePartTimeAccess();
  if (auth.error) return auth.error;

  const today = await eatToday();
  const param = req.nextUrl.searchParams.get("month");
  const month = param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const isAdmin = auth.session.role === "ADMIN";
  const [visits, options] = await Promise.all([
    listPartTimeVisits(`${month}-01`, `${month}-${String(lastDay).padStart(2, "0")}`, isAdmin),
    listPartTimeOptions(),
  ]);
  return NextResponse.json({ month, today, isAdmin, visits, ...options });
}

export async function POST(req: NextRequest) {
  const auth = await requirePartTimeAccess();
  if (auth.error) return auth.error;

  const parsed = partTimeVisitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  try {
    const id = await createPartTimeVisit(parsed.data, auth.session.id);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof PartTimeVisitError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
