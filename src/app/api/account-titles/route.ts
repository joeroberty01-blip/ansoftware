import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { findUserById } from "@/lib/repo/users";
import {
  getAccountTitle,
  listAccountTitles,
  setAccountTitle,
} from "@/lib/repo/account-titles";

const putSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().max(40, "Keep the title to 40 characters or fewer."),
});

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
  }
  const accounts = await listAccountTitles();
  return NextResponse.json({ accounts });
}

export async function PUT(req: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  const { userId, title } = parsed.data;
  const user = await findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const before = await getAccountTitle(userId);
  // An empty title is stored as blank, so the account falls back to its default label.
  await setAccountTitle(userId, title);

  if ((before ?? "") !== title) {
    await logAudit({
      userId: session.id,
      action: "ACCOUNT_TITLE_CHANGED",
      entity: "user",
      entityId: userId,
      meta: { from: before, to: title || null },
    });
  }

  return NextResponse.json({ title: title || null });
}
