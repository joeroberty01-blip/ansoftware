import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { socialLinksSchema } from "@/lib/validation/marketing";
import { getSocialLinks, setSocialLinks } from "@/lib/repo/marketing";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json(
      { error: "Unahitaji kuingia kwanza." },
      { status: 401 }
    );
  }

  const links = await getSocialLinks();
  return NextResponse.json({ links });
}

export async function PUT(req: Request) {
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

  const body = await req.json();
  const parsed = socialLinksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  await setSocialLinks(parsed.data);
  const links = await getSocialLinks();
  return NextResponse.json({ links });
}
