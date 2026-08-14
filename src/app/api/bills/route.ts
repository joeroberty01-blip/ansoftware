import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBillSchema } from "@/lib/validation/bills";
import { createBill, listBills } from "@/lib/repo/bills";

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

export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const bills = await listBills();
  return NextResponse.json({ bills });
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const body = await req.json();
  const parsed = createBillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const bill = await createBill({
    ...parsed.data,
    notes: parsed.data.notes ? parsed.data.notes : null,
    createdById: session.id,
  });

  return NextResponse.json({ bill }, { status: 201 });
}
