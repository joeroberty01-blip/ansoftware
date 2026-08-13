import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateItemSchema } from "@/lib/validation/inventory";
import { getItemById, listMovements, updateItem } from "@/lib/repo/inventory";

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

export async function PATCH(
  req: Request,
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
  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const item = await updateItem(id, parsed.data);
  if (!item) {
    return NextResponse.json({ error: "Item haikupatikana." }, { status: 404 });
  }

  return NextResponse.json({ item });
}
