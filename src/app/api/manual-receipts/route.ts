import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createManualReceiptSchema } from "@/lib/validation/manual-receipts";
import {
  createManualReceipt,
  listManualReceipts,
  DuplicateReceiptNumberError,
} from "@/lib/repo/manual-receipts";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const receipts = await listManualReceipts();
  return NextResponse.json({ receipts });
}

export async function POST(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const body = await req.json();
  const parsed = createManualReceiptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const d = parsed.data;
  try {
    const receipt = await createManualReceipt({
      receiptNumber: d.receiptNumber ? d.receiptNumber : null,
      issuedAt: d.issuedAt ? d.issuedAt : null,
      clientName: d.clientName,
      phone: d.phone ? d.phone : null,
      amount: d.amount,
      method: d.method,
      reference: d.reference ? d.reference : null,
      description: d.description ? d.description : null,
      issuedById: session.id,
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateReceiptNumberError) {
      return NextResponse.json(
        { error: "Namba hii ya risiti tayari ipo. Tumia namba nyingine." },
        { status: 400 }
      );
    }
    throw err;
  }
}
