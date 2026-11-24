import { NextResponse } from "next/server";
import { requirePartTimeAccess } from "@/lib/part-time-access";
import { PartTimeVisitError, updatePartTimeVisit } from "@/lib/repo/part-time-visits";
import { partTimeVisitSchema } from "@/lib/validation/part-time-visits";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePartTimeAccess();
  if (auth.error) return auth.error;
  const { id } = await params;

  const parsed = partTimeVisitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  try {
    await updatePartTimeVisit(id, parsed.data, auth.session.id);
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof PartTimeVisitError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
