import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffById, updateStaffProfile } from "@/lib/repo/staff";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: RouteContext<"/api/staff/[id]/photo">
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

  const uploadDir = path.join(process.cwd(), "public", "uploads", "staff");
  await mkdir(uploadDir, { recursive: true });

  const filename = `${id}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const photoUrl = `/uploads/staff/${filename}`;
  const updated = await updateStaffProfile(id, { photoUrl });

  return NextResponse.json({ staff: updated });
}
