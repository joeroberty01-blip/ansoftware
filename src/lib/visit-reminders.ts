import "server-only";
import { query } from "./db";
import { notifyOnce } from "./push";

/**
 * Progress must be filled three times a day (morning, afternoon, evening).
 * The scheduler calls runVisitReminders with one of these slots:
 *
 *   MISSED     07:00 EAT  nurse: visits from earlier days still not recorded
 *                         admins: yesterday's missed visits, per nurse
 *   MORNING    10:00 EAT  nurse: today's morning visits not yet filled
 *   AFTERNOON  15:00 EAT  nurse: today's afternoon visits not yet filled
 *   EVENING    20:00 EAT  nurse: today's evening visits (and visits with no
 *                         session set) not yet filled
 */
export const REMINDER_SLOTS = ["MISSED", "MORNING", "AFTERNOON", "EVENING"] as const;
export type ReminderSlot = (typeof REMINDER_SLOTS)[number];

const SESSION_WORD: Record<Exclude<ReminderSlot, "MISSED">, string> = {
  MORNING: "morning",
  AFTERNOON: "afternoon",
  EVENING: "evening",
};

/** Tanzania is UTC+3 all year (no daylight saving). */
export function eatDate(offsetDays = 0, now = new Date()): string {
  const t = now.getTime() + 3 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

function names(list: string[], max = 3): string {
  const unique = [...new Set(list)];
  const shown = unique.slice(0, max).join(", ");
  return unique.length > max ? `${shown} and ${unique.length - max} more` : shown;
}

interface NurseVisitRow {
  user_id: string;
  patient_name: string;
}

export interface ReminderResult {
  slot: ReminderSlot;
  date: string;
  nurses: number;
  sent: number;
  skippedAlreadySent: number;
  devicesReached: number;
  admins?: number;
}

export async function runVisitReminders(slot: ReminderSlot, now = new Date()): Promise<ReminderResult> {
  const today = eatDate(0, now);
  const result: ReminderResult = {
    slot,
    date: today,
    nurses: 0,
    sent: 0,
    skippedAlreadySent: 0,
    devicesReached: 0,
  };

  const tally = (delivered: number | null) => {
    if (delivered === null) result.skippedAlreadySent += 1;
    else {
      result.sent += 1;
      result.devicesReached += delivered;
    }
  };

  if (slot === "MISSED") {
    const rows = await query<NurseVisitRow>(
      `SELECT u.id AS user_id, p.full_name AS patient_name
       FROM home_visits hv
       JOIN patients p ON p.id = hv.patient_id
       JOIN staff s ON s.id = hv.staff_id
       JOIN users u ON u.id = s.user_id
       WHERE hv.status = 'SCHEDULED'
         AND hv.visit_date < $1::date
         AND u.status = 'APPROVED'`,
      [today]
    );
    const byNurse = groupByUser(rows);
    result.nurses = byNurse.size;
    for (const [userId, patients] of byNurse) {
      const n = patients.length;
      tally(
        await notifyOnce({
          userId,
          kind: "MISSED_VISITS",
          dedupeKey: `missed:${today}:${userId}`,
          payload: {
            title: n === 1 ? "You have 1 missed visit" : `You have ${n} missed visits`,
            body: `Not recorded yet: ${names(patients)}. Open the ERP and write the report or the reason.`,
            url: "/dashboard#missed-visits",
            tag: "missed-visits",
          },
        })
      );
    }

    // Admins: yesterday's missed visits, grouped by nurse.
    const yesterday = eatDate(-1, now);
    const perNurse = await query<{ nurse: string; count: string }>(
      `SELECT COALESCE(u.full_name, 'Unassigned') AS nurse, COUNT(*)::text AS count
       FROM home_visits hv
       LEFT JOIN staff s ON s.id = hv.staff_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE hv.status = 'SCHEDULED' AND hv.visit_date = $1::date
       GROUP BY 1 ORDER BY 2 DESC`,
      [yesterday]
    );
    const total = perNurse.reduce((sum, r) => sum + Number(r.count), 0);
    if (total > 0) {
      const admins = await query<{ id: string }>(
        `SELECT id FROM users WHERE role = 'ADMIN' AND status = 'APPROVED'`
      );
      result.admins = admins.length;
      const detail = perNurse
        .slice(0, 4)
        .map((r) => `${r.nurse} (${r.count})`)
        .join(", ");
      for (const admin of admins) {
        tally(
          await notifyOnce({
            userId: admin.id,
            kind: "MISSED_VISITS_ADMIN",
            dedupeKey: `missed-admin:${today}:${admin.id}`,
            payload: {
              title: total === 1 ? "1 visit was missed yesterday" : `${total} visits were missed yesterday`,
              body: detail,
              url: "/home-visits",
              tag: "missed-visits-admin",
            },
          })
        );
      }
    }
    return result;
  }

  const rows = await query<NurseVisitRow>(
    `SELECT u.id AS user_id, p.full_name AS patient_name
     FROM home_visits hv
     JOIN patients p ON p.id = hv.patient_id
     JOIN staff s ON s.id = hv.staff_id
     JOIN users u ON u.id = s.user_id
     WHERE hv.status = 'SCHEDULED'
       AND hv.visit_date = $1::date
       AND u.status = 'APPROVED'
       AND (hv.visit_session::text = $2 OR ($2 = 'EVENING' AND hv.visit_session IS NULL))`,
    [today, slot]
  );
  const byNurse = groupByUser(rows);
  result.nurses = byNurse.size;
  const word = SESSION_WORD[slot];
  for (const [userId, patients] of byNurse) {
    const n = patients.length;
    tally(
      await notifyOnce({
        userId,
        kind: `SESSION_${slot}`,
        dedupeKey: `session:${today}:${slot}:${userId}`,
        payload: {
          title: `Fill in the ${word} progress`,
          body:
            n === 1
              ? `The visit for ${patients[0]} isn't filled in yet.`
              : `${n} visits aren't filled in yet: ${names(patients)}.`,
          url: "/dashboard",
          tag: `session-${slot.toLowerCase()}`,
        },
      })
    );
  }
  return result;
}

function groupByUser(rows: NurseVisitRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.user_id) ?? [];
    list.push(r.patient_name);
    map.set(r.user_id, list);
  }
  return map;
}
