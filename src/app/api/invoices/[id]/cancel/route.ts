import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelInvoice } from "@/lib/repo/invoices";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Document not found." },
  ALREADY_CANCELLED: { status: 400, message: "This document is already cancelled." },
  HAS_PAYMENTS: {
    status: 400,
    message:
      "This document has recorded payments and can't be cancelled. Use a credit note instead.",
  },
};

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]/cancel">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
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
