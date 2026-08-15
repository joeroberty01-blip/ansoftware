import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createExpenseSchema } from "@/lib/validation/expenses";
import {
  createExpense,
  listAllExpenses,
  listRecentExpenses,
  listExpensesForUser,
} from "@/lib/repo/expenses";

async function requireSession() {
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
  return { session, response: null };
}

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (!session) return response;

  if (session.role !== "ADMIN") {
    // Staff can only ever see their own expense requests, never the
    // company-wide list.
    const expenses = await listExpensesForUser(session.id);
    return NextResponse.json({ expenses });
  }

  const all = req.nextUrl.searchParams.get("all") === "true";
  const expenses = all ? await listAllExpenses() : await listRecentExpenses(20);
  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (!session) return response;

  const body = await req.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  // Staff-submitted expenses start as a request awaiting Admin approval;
  // expenses an Admin records directly are approved immediately.
  const expense = await createExpense({
    ...parsed.data,
    paymentMethod: parsed.data.paymentMethod || null,
    createdById: session.id,
    status: session.role === "ADMIN" ? "APPROVED" : "PENDING",
  });

  return NextResponse.json({ expense }, { status: 201 });
}
