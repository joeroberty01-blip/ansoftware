import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClientById } from "@/lib/repo/clients";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/clients/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const client = await getClientById(id);
  if (!client) {
    return NextResponse.json({ error: "Client hakupatikana." }, { status: 404 });
  }

  return NextResponse.json({ client });
}
