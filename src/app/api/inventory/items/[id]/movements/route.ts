import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordMovementSchema } from "@/lib/validation/inventory";
import { recordStockMovement } from "@/lib/repo/inventory";

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NOT_FOUND: { status: 404, message: "Item haikupatikana." },
  INSUFFICIENT_STOCK: {
    status: 400,
    message: "Kiasi kinachotolewa ni zaidi ya stock iliyopo.",
  },
};

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/inventory/items/[id]/movements">
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
  const parsed = recordMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  try {
    const movement = await recordStockMovement({
      itemId: id,
      movementType: parsed.data.movementType,
      quantity: parsed.data.quantity,
      batchNumber: parsed.data.batchNumber ? parsed.data.batchNumber : null,
      expiryDate: parsed.data.expiryDate ? parsed.data.expiryDate : null,
      reference: parsed.data.reference ? parsed.data.reference : null,
      notes: parsed.data.notes ? parsed.data.notes : null,
      createdById: session.id,
    });
    return NextResponse.json({ movement }, { status: 201 });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    const mapped = ERROR_RESPONSES[code];
    if (mapped) {
      return NextResponse.json(
        { error: mapped.message },
        { status: mapped.status }
      );
    }
    throw err;
  }
}
