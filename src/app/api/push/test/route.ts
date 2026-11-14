import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pushConfigured, sendPushToUser } from "@/lib/push";

/** Sends a test notification to the signed-in user's own devices. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unahitaji kuingia kwanza." }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "Arifa hazijawashwa kwenye server (VAPID keys hazipo)." },
      { status: 503 }
    );
  }
  const delivered = await sendPushToUser(user.id, {
    title: "Arifa zimewashwa ✅",
    body: "Utapokea vikumbusho vya kujaza progress na ziara ulizokosa.",
    url: "/dashboard",
    tag: "test",
  });
  if (delivered === 0) {
    return NextResponse.json(
      { error: "Hakuna simu iliyopokea. Washa arifa tena kwenye kifaa hiki." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true, delivered });
}
