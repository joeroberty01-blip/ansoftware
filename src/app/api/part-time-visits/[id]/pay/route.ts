import { NextResponse } from "next/server";
import { requirePartTimeAccess } from "@/lib/part-time-access";
import { PartTimeVisitError, updatePartTimePay } from "@/lib/repo/part-time-visits";
import { partTimePaySchema } from "@/lib/validation/part-time-visits";

/** Admin only: amount (with its reason), paid, or undo a wrong payment mark. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePartTimeAccess();
  if (auth.error) return auth.error;
  if (auth.session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
  }
  const { id } = await params;

  const parsed = partTimePaySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }
  try {
    await updatePartTimePay(id, parsed.data, auth.session.id);
    return NextResponse.json({ id });
  } catch (err) {
    if (err instanceof PartTimeVisitError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
