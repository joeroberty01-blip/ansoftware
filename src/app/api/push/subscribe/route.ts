import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { deletePushSubscription, savePushSubscription } from "@/lib/repo/push";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(8).max(100),
  }),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });

  const parsed = subscriptionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Usajili wa arifa si sahihi." }, { status: 400 });
  }
  // Push services are always HTTPS; refuse anything else.
  if (!parsed.data.endpoint.startsWith("https://")) {
    return NextResponse.json({ error: "Usajili wa arifa si sahihi." }, { status: 400 });
  }

  await savePushSubscription({
    userId: user.id,
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") {
    return NextResponse.json({ error: "Endpoint inahitajika." }, { status: 400 });
  }
  await deletePushSubscription(user.id, body.endpoint);
  return NextResponse.json({ ok: true });
}
