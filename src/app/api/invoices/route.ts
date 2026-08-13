import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createInvoiceSchema, DOC_TYPES } from "@/lib/validation/invoices";
import { createInvoiceWithItems, listInvoices } from "@/lib/repo/invoices";
import type { DocType } from "@/lib/repo/invoices";

export async function GET(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const docTypeParam = req.nextUrl.searchParams.get("docType");
  const paymentStatusParam = req.nextUrl.searchParams.get("paymentStatus");
  const clientId = req.nextUrl.searchParams.get("clientId") ?? undefined;
  const outstandingOnly = req.nextUrl.searchParams.get("outstanding") === "true";

  const docType = (DOC_TYPES as readonly string[]).includes(docTypeParam ?? "")
    ? (docTypeParam as DocType)
    : undefined;
  const paymentStatus = paymentStatusParam ?? undefined;

  const invoices = await listInvoices({
    docType,
    paymentStatus,
    clientId,
    outstandingOnly,
  });
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const invoice = await createInvoiceWithItems({
    docType: parsed.data.docType,
    clientId: parsed.data.clientId,
    dueDate: parsed.data.dueDate ? parsed.data.dueDate : null,
    notes: parsed.data.notes ? parsed.data.notes : null,
    items: parsed.data.items,
    createdById: session.id,
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
