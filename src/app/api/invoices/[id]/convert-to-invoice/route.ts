import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertBillingAccess } from "@/lib/permissions";
import { convertToPayableDocument } from "@/lib/repo/invoices";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Document not found." },
  NOT_CONVERTIBLE: {
    status: 400,
    message:
      "This document can't be converted (only a Quotation becomes an Invoice, and only a Proforma becomes a Tax Invoice).",
  },
  ALREADY_CONVERTED: {
    status: 400,
    message: "This document has already been converted.",
  },
};

export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]/convert-to-invoice">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in first." },
      { status: 401 }
    );
  }
  const noBilling = await assertBillingAccess(session);
  if (noBilling) return noBilling;

  const { id } = await ctx.params;

  try {
    const invoice = await convertToPayableDocument(id, session.id);
    return NextResponse.json({ invoice }, { status: 201 });
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
