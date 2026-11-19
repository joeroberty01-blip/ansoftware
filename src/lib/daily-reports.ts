/**
 * Visit records grouped as the care team reads them: one report per
 * patient per day, holding that day's morning, afternoon and evening
 * entries. Pure functions, used by pages, the print view and the PDF.
 */

export const DAILY_SESSIONS = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type DailySession = (typeof DAILY_SESSIONS)[number];

export const DAILY_SESSION_LABELS: Record<DailySession, string> = {
  MORNING: "Asubuhi",
  AFTERNOON: "Mchana",
  EVENING: "Jioni",
};

/** Label for visits recorded before sessions existed. */
export const NO_SESSION_LABEL = "Bila muda";

export interface DailyVisitLike {
  patient_id: string;
  visit_date: string | Date;
  visit_session: string | null;
  status: string;
  created_at?: string | Date;
}

export interface DailyReport<V extends DailyVisitLike> {
  key: string;
  patientId: string;
  date: string;
  /** Entries per session, oldest first (normally one each). */
  sessions: Record<DailySession, V[]>;
  /** Entries with no session recorded. */
  other: V[];
  visits: V[];
}

/** "YYYY-MM-DD" of a DATE value, whichever way the driver returned it. */
export function dayOf(value: string | Date): string {
  if (typeof value === "string") return value.slice(0, 10);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isDailySession(s: string | null): s is DailySession {
  return s === "MORNING" || s === "AFTERNOON" || s === "EVENING";
}

const time = (v: DailyVisitLike) => (v.created_at ? new Date(v.created_at).getTime() : 0);

/** Groups visits into daily reports, newest day first, keeping the input's patient order. */
export function groupDailyReports<V extends DailyVisitLike>(visits: V[]): DailyReport<V>[] {
  const byKey = new Map<string, DailyReport<V>>();
  for (const v of visits) {
    const date = dayOf(v.visit_date);
    const key = `${date}|${v.patient_id}`;
    let report = byKey.get(key);
    if (!report) {
      report = {
        key,
        patientId: v.patient_id,
        date,
        sessions: { MORNING: [], AFTERNOON: [], EVENING: [] },
        other: [],
        visits: [],
      };
      byKey.set(key, report);
    }
    report.visits.push(v);
    if (isDailySession(v.visit_session)) report.sessions[v.visit_session].push(v);
    else report.other.push(v);
  }
  const reports = [...byKey.values()];
  for (const r of reports) {
    for (const s of DAILY_SESSIONS) r.sessions[s].sort((a, b) => time(a) - time(b));
    r.other.sort((a, b) => time(a) - time(b));
  }
  // Stable sort keeps the caller's order (e.g. by name) within a day.
  return reports.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export type SessionState = "done" | "scheduled" | "cancelled" | "empty";

/** What a session slot shows: filled, only planned, cancelled, or nothing yet. */
export function sessionState(entries: DailyVisitLike[]): SessionState {
  if (entries.some((v) => v.status === "COMPLETED")) return "done";
  if (entries.some((v) => v.status === "SCHEDULED")) return "scheduled";
  if (entries.length > 0) return "cancelled";
  return "empty";
}
