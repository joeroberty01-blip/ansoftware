import { NextResponse } from "next/server";
import { requirePartTimeAccess } from "@/lib/part-time-access";
import { PartTimeVisitError, voidPartTimeVisit } from "@/lib/repo/part-time-visits";
import { voidPartTimeVisitSchema } from "@/lib/validation/part-time-visits";

/** Cancels a wrong record; it stays on file and is left out of the totals. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePartTimeAccess();
  if (auth.error) return auth.error;
  const { id } = await params;

  const parsed = voidPartTimeVisitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  try {
    await voidPartTimeVisit(id, parsed.data.reason, auth.session.id);
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof PartTimeVisitError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
