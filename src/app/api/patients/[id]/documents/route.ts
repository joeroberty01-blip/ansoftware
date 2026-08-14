import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addDocumentSchema } from "@/lib/validation/patients";
import { addDocument, listDocuments } from "@/lib/repo/patients";
import { assertPatientAccess } from "@/lib/patient-access";

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

  const body = await req.json();
  const parsed = addDocumentSchema.safeParse(body);
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
  });

  return NextResponse.json({ document }, { status: 201 });
}
