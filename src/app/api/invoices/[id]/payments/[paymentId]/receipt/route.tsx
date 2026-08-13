import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { getPaymentWithContext } from "@/lib/repo/invoices";
import { ReceiptDocument } from "@/lib/pdf/receipt-document";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]/payments/[paymentId]/receipt">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id, paymentId } = await ctx.params;
  const payment = await getPaymentWithContext(id, paymentId);
  if (!payment) {
    return NextResponse.json(
      { error: "Malipo hayakupatikana." },
      { status: 404 }
    );
  }

  const buffer = await renderToBuffer(<ReceiptDocument payment={payment} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="risiti-${payment.document_number}.pdf"`,
    },
  });
}
