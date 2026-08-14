import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listAllPayments } from "@/lib/repo/invoices";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const payments = await listAllPayments();
  return NextResponse.json({ payments });
}
