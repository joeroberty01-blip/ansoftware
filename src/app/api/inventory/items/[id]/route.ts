import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getItemById, listMovements } from "@/lib/repo/inventory";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/inventory/items/[id]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const item = await getItemById(id);
  if (!item) {
    return NextResponse.json({ error: "Item haikupatikana." }, { status: 404 });
  }

  const movements = await listMovements(id);
  return NextResponse.json({ item, movements });
}
