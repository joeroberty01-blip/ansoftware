import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteStaffDocument } from "@/lib/repo/staff-documents";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/documents/[docId]">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
  }

  const { docId } = await ctx.params;
  const deleted = await deleteStaffDocument(docId);
  if (!deleted) {
    return NextResponse.json({ error: "Hati haikupatikana." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
