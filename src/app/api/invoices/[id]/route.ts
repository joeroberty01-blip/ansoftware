import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertBillingAccess } from "@/lib/permissions";
import { getInvoiceDetail } from "@/lib/repo/invoices";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  const noBilling = await assertBillingAccess(session);
  if (noBilling) return noBilling;

  const { id } = await ctx.params;
  const invoice = await getInvoiceDetail(id);
  if (!invoice) {
    return NextResponse.json(
      { error: "Invoice/Quotation haikupatikana." },
      { status: 404 }
    );
  }

  return NextResponse.json({ invoice });
}
