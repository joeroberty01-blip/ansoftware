import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

  const { id } = await ctx.params;
  const payments = await listPaymentsForClient(id);
  return NextResponse.json({ payments });
}
