import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createInvoiceSchema, DOC_TYPES } from "@/lib/validation/invoices";
import {
  createInvoiceWithItems,
  listInvoices,
  DuplicateDocumentNumberError,
} from "@/lib/repo/invoices";
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

  try {
    const invoice = await createInvoiceWithItems({
      docType: parsed.data.docType,
      documentNumber: parsed.data.documentNumber ? parsed.data.documentNumber : null,
      issueDate: parsed.data.issueDate ? parsed.data.issueDate : null,
      clientId: parsed.data.clientId ? parsed.data.clientId : null,
      newClient: parsed.data.newClient
        ? {
            name: parsed.data.newClient.name,
            phone: parsed.data.newClient.phone,
            email: parsed.data.newClient.email ? parsed.data.newClient.email : null,
            type: parsed.data.newClient.type,
            address: parsed.data.newClient.address
              ? parsed.data.newClient.address
              : null,
          }
        : null,
      dueDate: parsed.data.dueDate ? parsed.data.dueDate : null,
      notes: parsed.data.notes ? parsed.data.notes : null,
      items: parsed.data.items,
      createdById: session.id,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateDocumentNumberError) {
      return NextResponse.json(
        { error: "Namba hii ya hati tayari ipo. Tumia namba nyingine." },
        { status: 400 }
      );
    }
    throw err;
  }
}
