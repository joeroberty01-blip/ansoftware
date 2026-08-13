import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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
