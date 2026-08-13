import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelInvoice } from "@/lib/repo/invoices";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Hati haikupatikana." },
  ALREADY_CANCELLED: { status: 400, message: "Hati hii tayari imeghairiwa." },
  HAS_PAYMENTS: {
    status: 400,
    message:
      "Hati hii ina malipo yaliyorekodiwa, haiwezi kughairiwa. Tumia credit note badala yake.",
  },
};

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]/cancel">
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
    const invoice = await cancelInvoice(id, session.id);
    return NextResponse.json({ invoice });
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
