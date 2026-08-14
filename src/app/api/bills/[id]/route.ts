import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateBillSchema } from "@/lib/validation/bills";
import { deleteBill, updateBill } from "@/lib/repo/bills";

async function requireAdmin() {
  const session = await getCurrentUser();
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Unahitaji kuingia kwanza." },
        { status: 401 }
      ),
    };
  }
  if (session.role !== "ADMIN") {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Ruhusa hairuhusiwi." },
        { status: 403 }
      ),
    };
  }
  return { session, response: null };
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/bills/[id]">
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateBillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const bill = await updateBill(id, {
    name: d.name,
    category: d.category,
    amount: d.amount,
    dueDate: d.dueDate,
    notes: d.notes === undefined ? undefined : d.notes || null,
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill haikupatikana." }, { status: 404 });
  }

  return NextResponse.json({ bill });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/bills/[id]">
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const { id } = await ctx.params;
  try {
    await deleteBill(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Bill haikupatikana." }, { status: 404 });
    }
    if (code === "ALREADY_PAID") {
      return NextResponse.json(
        { error: "Bill hii tayari imelipwa, haiwezi kufutwa." },
        { status: 400 }
      );
    }
    throw err;
  }
}
