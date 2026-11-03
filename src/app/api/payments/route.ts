import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertBillingAccess } from "@/lib/permissions";
import { listAllPayments } from "@/lib/repo/invoices";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  const noBilling = await assertBillingAccess(session);
  if (noBilling) return noBilling;

  const payments = await listAllPayments();
  return NextResponse.json({ payments });
}
