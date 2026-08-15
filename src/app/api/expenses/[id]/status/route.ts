import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExpenseById, setExpenseStatus } from "@/lib/repo/expenses";

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/expenses/[id]/status">
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
  const existing = await getExpenseById(id);
  if (!existing) {
    return NextResponse.json({ error: "Expense haikupatikana." }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json(
      { error: "Ombi hili tayari limeshughulikiwa." },
      { status: 400 }
    );
  }

  const body = await req.json();
  if (body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json({ error: "Status si sahihi." }, { status: 400 });
  }

  const expense = await setExpenseStatus(id, body.status);
  return NextResponse.json({ expense });
}
