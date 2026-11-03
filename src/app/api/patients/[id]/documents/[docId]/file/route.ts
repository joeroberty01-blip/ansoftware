import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { assertPatientAccess } from "@/lib/patient-access";
import { getDocumentFile } from "@/lib/repo/patients";

export async function GET(
  req: Request,
  ctx: RouteContext<"/api/patients/[id]/documents/[docId]/file">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id, docId } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const file = await getDocumentFile(id, docId);
  if (!file) {
    return NextResponse.json({ error: "Faili halikupatikana." }, { status: 404 });
  }

  await logAudit({ userId: session.id, action: "PATIENT_DOCUMENT_VIEWED", entity: "patient_document", entityId: docId, meta: { patientId: id } });
  const download = new URL(req.url).searchParams.get("download") === "1";
  const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
