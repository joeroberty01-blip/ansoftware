import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { getStaffById } from "@/lib/repo/staff";
import { StaffIdCardDocument } from "@/lib/pdf/staff-id-card-document";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

async function photoToDataUri(photoUrl: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  const ext = photoUrl.split(".").pop()?.toLowerCase() ?? "";
  const mime = MIME_BY_EXT[ext];
  if (!mime) return null;
  try {
    if (photoUrl.startsWith("http")) {
      const res = await fetch(photoUrl);
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }
    const filePath = path.join(process.cwd(), "public", photoUrl);
    const buffer = await readFile(filePath);
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/staff/[id]/id-card">
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

  const [photoDataUri, qrDataUri] = await Promise.all([
    photoToDataUri(staff.photo_url),
    QRCode.toDataURL(
      `AFYA NYUMBANI HOME CARE\nJina: ${staff.full_name}\nID: ${staff.staff_number}\nTaaluma: ${staff.profession}\nhttps://afyanyumbani.com`,
      { margin: 1, width: 200 }
    ),
  ]);

  const buffer = await renderToBuffer(
    <StaffIdCardDocument
      staff={staff}
      photoDataUri={photoDataUri}
      qrDataUri={qrDataUri}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${staff.staff_number}-ID-Card.pdf"`,
    },
  });
}
