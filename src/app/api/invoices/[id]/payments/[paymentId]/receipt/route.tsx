import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { assertBillingAccess } from "@/lib/permissions";
import { getPaymentWithContext } from "@/lib/repo/invoices";
import { ReceiptDocument } from "@/lib/pdf/receipt-document";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/invoices/[id]/payments/[paymentId]/receipt">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "You need to sign in first." },
      { status: 401 }
    );
  }
  const noBilling = await assertBillingAccess(session);
  if (noBilling) return noBilling;

  const { id, paymentId } = await ctx.params;
  const payment = await getPaymentWithContext(id, paymentId);
  if (!payment) {
    return NextResponse.json(
      { error: "Malipo hayakupatikana." },
      { status: 404 }
    );
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const buffer = await renderToBuffer(<ReceiptDocument payment={payment} />);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="risiti-${payment.receipt_number}.pdf"`,
    },
  });
}
