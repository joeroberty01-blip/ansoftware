import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { payBill } from "@/lib/repo/bills";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Bill haikupatikana." },
  ALREADY_PAID: { status: 400, message: "Bill hii tayari imelipwa." },
};

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/bills/[id]/pay">
) {
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

  const { id } = await ctx.params;

  try {
    const bill = await payBill(id, session.id);
    return NextResponse.json({ bill });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const mapped = ERROR_RESPONSES[code];
    if (mapped) {
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      );
    }
    throw err;
  }
}
