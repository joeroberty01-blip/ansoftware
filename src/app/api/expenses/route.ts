import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createExpenseSchema } from "@/lib/validation/expenses";
import { createExpense, listAllExpenses, listRecentExpenses } from "@/lib/repo/expenses";

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

export async function GET(req: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const all = req.nextUrl.searchParams.get("all") === "true";
  const expenses = all ? await listAllExpenses() : await listRecentExpenses(20);
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const body = await req.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const expense = await createExpense({
    ...parsed.data,
    paymentMethod: parsed.data.paymentMethod || null,
    createdById: session.id,
  });

  return NextResponse.json({ expense }, { status: 201 });
}
