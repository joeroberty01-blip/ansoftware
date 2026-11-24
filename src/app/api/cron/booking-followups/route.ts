import { NextRequest, NextResponse } from "next/server";
import { runFollowUpReminders } from "@/lib/booking-followups";
import { cronAuthorized } from "@/lib/cron-auth";
import { pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron, once a day (see vercel.json). */
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  }
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ error: "VAPID keys are not set." }, { status: 503 });
  }
  try {
    const result = await runFollowUpReminders();
    console.log("[cron] booking-followups", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] booking-followups failed:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
