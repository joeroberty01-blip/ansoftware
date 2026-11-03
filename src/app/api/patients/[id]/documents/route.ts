import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { addDocumentSchema } from "@/lib/validation/patients";
import { addDocument, listDocuments } from "@/lib/repo/patients";
import { assertPatientAccess } from "@/lib/patient-access";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
// Vercel rejects request bodies over ~4.5MB, so stay safely under that.
const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/patients/[id]/documents">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const documents = await listDocuments(id);
  return NextResponse.json({ documents });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/patients/[id]/documents">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  const denied = await assertPatientAccess(session, id);
  if (denied) return denied;

  const contentType = req.headers.get("content-type") ?? "";
  let raw: Record<string, unknown>;
  let file: { name: string; mimeType: string; data: Buffer } | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    raw = {
      title: form.get("title") ?? "",
      documentType: form.get("documentType") ?? "",
      notes: form.get("notes") ?? "",
    };
    const upload = form.get("file");
    if (upload instanceof File && upload.size > 0) {
      if (!ALLOWED_MIME_TYPES.has(upload.type)) {
        return NextResponse.json(
          { error: "Aina ya faili inayoruhusiwa: JPEG, PNG, WEBP, PDF." },
          { status: 400 }
        );
      }
      if (upload.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Faili isizidi 4MB." },
          { status: 400 }
        );
      }
      file = {
        name: upload.name || "document",
        mimeType: upload.type,
        data: Buffer.from(await upload.arrayBuffer()),
      };
    }
  } else {
    raw = await req.json();
  }

  const parsed = addDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const document = await addDocument({
    patientId: id,
    title: parsed.data.title,
    documentType: parsed.data.documentType,
    notes: parsed.data.notes ? parsed.data.notes : null,
    uploadedById: session.id,
    file,
  });

  await logAudit({ userId: session.id, action: "PATIENT_DOCUMENT_UPLOADED", entity: "patient_document", entityId: document.id, meta: { patientId: id, type: document.document_type, hasFile: !!file } });
  return NextResponse.json({ document }, { status: 201 });
}
