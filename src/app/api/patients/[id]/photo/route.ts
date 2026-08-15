import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { getPatientById, updatePatient } from "@/lib/repo/patients";
import { assertPatientAccess } from "@/lib/patient-access";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/patients/[id]/photo">
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

  const patient = await getPatientById(id);
  if (!patient) {
    return NextResponse.json({ error: "Mgonjwa hakupatikana." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Picha inahitajika." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Aina ya picha inayoruhusiwa: JPEG, PNG, WEBP." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Picha isizidi 5MB." },
      { status: 400 }
    );
  }

  const filename = `${id}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let photoUrl: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`patient-photos/${filename}`, buffer, {
      access: "public",
      contentType: file.type,
    });
    photoUrl = blob.url;
  } else {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "patients");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    photoUrl = `/uploads/patients/${filename}`;
  }

  const updated = await updatePatient(id, { photoUrl });

  return NextResponse.json({ patient: updated });
}
