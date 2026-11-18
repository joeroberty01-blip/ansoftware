import "server-only";
import { query } from "./db";
import { notifyOnce } from "./push";
import { listDueFollowUps } from "./repo/bookings";
import { eatDate } from "./visit-reminders";

export interface FollowUpReminderResult {
  date: string;
  due: number;
  overdue: number;
  admins: number;
  sent: number;
  skippedAlreadySent: number;
  devicesReached: number;
}

/**
 * Morning reminder (09:00 EAT) to every approved admin: the requests whose
 * follow-up date is today or already past. Sent at most once a day each.
 */
export async function runFollowUpReminders(now = new Date()): Promise<FollowUpReminderResult> {
  const today = eatDate(0, now);
  const due = await listDueFollowUps();
  const overdue = due.filter((b) => b.overdue).length;
  const result: FollowUpReminderResult = {
    date: today,
    due: due.length,
    overdue,
    admins: 0,
    sent: 0,
    skippedAlreadySent: 0,
    devicesReached: 0,
  };
  if (due.length === 0) return result;

  const admins = await query<{ id: string }>(
    `SELECT id FROM users WHERE role = 'ADMIN' AND status = 'APPROVED'`
  );
  result.admins = admins.length;

  const names = due.slice(0, 3).map((b) => b.full_name);
  const more = due.length > 3 ? ` na wengine ${due.length - 3}` : "";
  const late = overdue > 0 ? ` (${overdue} wamechelewa)` : "";
  const title =
    due.length === 1 ? "Ombi 1 la kufuatilia leo" : `Maombi ${due.length} ya kufuatilia leo`;

  for (const admin of admins) {
    const delivered = await notifyOnce({
      userId: admin.id,
      kind: "BOOKING_FOLLOW_UP",
      dedupeKey: `followup:${today}:${admin.id}`,
      payload: {
        title,
        body: `${names.join(", ")}${more}${late}. Piga simu au tuma WhatsApp, kisha rekodi kwenye ERP.`,
        url: "/bookings?due=1",
        tag: "booking-follow-up",
      },
    });
    if (delivered === null) result.skippedAlreadySent += 1;
    else {
      result.sent += 1;
      result.devicesReached += delivered;
    }
  }
  return result;
}
