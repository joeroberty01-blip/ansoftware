import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pushConfigured, sendPushToUser } from "@/lib/push";

/** Sends a test notification to the signed-in user's own devices. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "Notifications aren't enabled on the server (VAPID keys missing)." },
      { status: 503 }
    );
  }
  const delivered = await sendPushToUser(user.id, {
    title: "Notifications are on ✅",
    body: "You'll get reminders to fill in progress and about missed visits.",
    url: "/dashboard",
    tag: "test",
  });
  if (delivered === 0) {
    return NextResponse.json(
      { error: "No phone received it. Turn notifications on again on this device." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, delivered });
}
