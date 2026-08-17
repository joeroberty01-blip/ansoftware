import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createIncomeSchema } from "@/lib/validation/income";
import { createIncome, listAllIncome, listRecentIncome } from "@/lib/repo/income";

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
  const income = all ? await listAllIncome() : await listRecentIncome(20);
  return NextResponse.json({ income });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const body = await req.json();
  const parsed = createIncomeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const income = await createIncome({
    ...parsed.data,
    paymentMethod: parsed.data.paymentMethod || null,
    createdById: session.id,
  });

  return NextResponse.json({ income }, { status: 201 });
}
