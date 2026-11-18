import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { pushConfigured } from "@/lib/push";
import { REMINDER_SLOTS, runVisitReminders, type ReminderSlot } from "@/lib/visit-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET haijawekwa." }, { status: 503 });
  }
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "Hairuhusiwi." }, { status: 401 });
  }
  const slot = req.nextUrl.searchParams.get("slot") as ReminderSlot | null;
  if (!slot || !REMINDER_SLOTS.includes(slot)) {
    return NextResponse.json(
      { error: `slot lazima iwe moja ya: ${REMINDER_SLOTS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!pushConfigured()) {
    return NextResponse.json({ error: "VAPID keys hazijawekwa." }, { status: 503 });
  }

  try {
    const result = await runVisitReminders(slot);
    console.log("[cron] visit-reminders", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] visit-reminders failed:", err);
    return NextResponse.json({ error: "Imeshindikana." }, { status: 500 });
  }
}
