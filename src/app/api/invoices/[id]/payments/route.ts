import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordPaymentSchema } from "@/lib/validation/invoices";
import { recordPayment } from "@/lib/repo/invoices";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Invoice haikupatikana." },
  NOT_PAYABLE: {
    status: 400,
    message:
      "Huwezi kurekodi malipo kwenye Quotation/Proforma. Igeuze kuwa Invoice/Tax Invoice kwanza.",
  },
  ALREADY_SETTLED: {
    status: 400,
    message: "Invoice hii tayari imelipwa kikamilifu au imefutwa.",
  },
};

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/invoices/[id]/payments">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = recordPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  try {
    const result = await recordPayment(
      id,
      {
        amount: parsed.data.amount,
        method: parsed.data.method,
        reference: parsed.data.reference ? parsed.data.reference : null,
        notes: parsed.data.notes ? parsed.data.notes : null,
      },
      session.id
    );
    return NextResponse.json(result, { status: 201 });
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
