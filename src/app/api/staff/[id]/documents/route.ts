import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { getStaffById } from "@/lib/repo/staff";
import { listStaffDocuments, addStaffDocument } from "@/lib/repo/staff-documents";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_SIZE = 10 * 1024 * 1024;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/documents">
) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const { id } = await ctx.params;
  if (session.role !== "ADMIN") {
    const own = await getStaffById(id);
    if (!own || own.user_id !== session.id) {
      return NextResponse.json({ error: "Ruhusa hairuhusiwi." }, { status: 403 });
    }
  }

  const documents = await listStaffDocuments(id);
  return NextResponse.json({ documents });
}

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/staff/[id]/documents">
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

  const { id } = await ctx.params;
  const staff = await getStaffById(id);
  if (!staff) {
    return NextResponse.json({ error: "Staff hakupatikana." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const documentType = String(formData.get("documentType") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Faili inahitajika." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Jina la hati linahitajika." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Aina ya faili inayoruhusiwa: JPEG, PNG, WEBP, PDF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Faili isizidi 10MB." }, { status: 400 });
  }

  const filename = `${id}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let fileUrl: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`staff-documents/${filename}`, buffer, {
      access: "public",
      contentType: file.type,
    });
    fileUrl = blob.url;
  } else {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "staff-documents");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    fileUrl = `/uploads/staff-documents/${filename}`;
  }

  const document = await addStaffDocument({
    staffId: id,
    title,
    documentType: documentType || "Other",
    fileUrl,
    uploadedById: session.id,
  });

  return NextResponse.json({ document }, { status: 201 });
}
