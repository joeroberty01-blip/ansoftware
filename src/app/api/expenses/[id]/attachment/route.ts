import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/auth";
import { getExpenseById, setExpenseAttachment } from "@/lib/repo/expenses";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/expenses/[id]/attachment">
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
  const expense = await getExpenseById(id);
  if (!expense) {
    return NextResponse.json({ error: "Expense haikupatikana." }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("attachment");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Faili inahitajika." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Aina ya faili inayoruhusiwa: JPEG, PNG, WEBP, PDF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Faili isizidi 10MB." },
      { status: 400 }
    );
  }

  const filename = `${id}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let attachmentUrl: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`expense-attachments/${filename}`, buffer, {
      access: "public",
      contentType: file.type,
    });
    attachmentUrl = blob.url;
  } else {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "expenses");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    attachmentUrl = `/uploads/expenses/${filename}`;
  }

  const updated = await setExpenseAttachment(id, attachmentUrl);

  return NextResponse.json({ expense: updated });
}
