import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { getInvoiceDetail } from "@/lib/repo/invoices";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { invoiceQrText } from "@/lib/invoice-brand";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/invoices/[id]/pdf">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "You need to sign in first." },
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

  const qrDataUri = await QRCode.toDataURL(invoiceQrText(invoice), {
    margin: 1,
    width: 200,
  });

  const buffer = await renderToBuffer(
    <InvoiceDocument invoice={invoice} qrDataUri={qrDataUri} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.document_number}.pdf"`,
    },
  });
}
