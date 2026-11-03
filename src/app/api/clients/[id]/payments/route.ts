import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { assertBillingAccess } from "@/lib/permissions";
import { listPaymentsForClient } from "@/lib/repo/clients";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/clients/[id]/payments">
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
  const payments = await listPaymentsForClient(id);
  return NextResponse.json({ payments });
}
