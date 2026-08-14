import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateItemSchema } from "@/lib/validation/inventory";
import { deleteItem, getItemById, listMovements, updateItem } from "@/lib/repo/inventory";

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

const DELETE_ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Item haikupatikana." },
  HAS_MOVEMENTS: {
    status: 400,
    message:
      "Item hii ina historia ya stock movements, haiwezi kufutwa. Zima badala yake au acha kama ilivyo.",
  },
};

export async function DELETE(
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
  try {
    await deleteItem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const mapped = DELETE_ERROR_RESPONSES[code];
    if (mapped) {
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      );
    }
    throw err;
  }
}
