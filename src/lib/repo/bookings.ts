import type { PoolClient } from "pg";
import { query, queryOne } from "../db";
import type { BookingRow } from "../types";

export interface BookingWithNames extends BookingRow {
  staff_name: string | null;
  patient_name: string | null;
}

export interface BookingFollowUpRow {
  id: string;
  booking_id: string;
  channel: string;
  note: string;
  next_follow_up_date: string | null;
  created_by_id: string;
  created_by_name: string | null;
  created_at: string;
}

/** Today's date in Dar es Salaam, computed by Postgres. */
export const EAT_TODAY_SQL = `(now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date`;

const OPEN_STATUSES_SQL = `('NEW', 'ASSIGNED')`;

const SELECT_WITH_NAMES = `
  b.*,
  u.full_name AS staff_name,
  p.full_name AS patient_name
`;

export async function createBooking(input: {
  fullName: string;
  phone: string;
  serviceType: string;
  preferredDate: string | null;
  notes: string | null;
  createdById: string;
  source?: string | null;
  sourceDetail?: string | null;
  /** Defaults to today: a new request gets its first call the same day. */
  nextFollowUpDate?: string | null;
}): Promise<BookingRow> {
  const row = await queryOne<BookingRow>(
    `INSERT INTO bookings (full_name, phone, service_type, preferred_date, notes, created_by_id,
                           source, source_detail, next_follow_up_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::date, ${EAT_TODAY_SQL}))
     RETURNING *`,
    [
      input.fullName,
      input.phone,
      input.serviceType,
      input.preferredDate,
      input.notes,
      input.createdById,
      input.source ?? null,
      input.sourceDetail ?? null,
      input.nextFollowUpDate ?? null,
    ]
  );
  if (!row) throw new Error("Imeshindwa kutengeneza booking");
  return row;
}

export async function listBookings(filters: {
  status?: string;
  /** Only open requests whose follow-up date is today or earlier. */
  due?: boolean;
}): Promise<BookingWithNames[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`b.status = $${params.length}`);
  }
  if (filters.due) {
    conditions.push(
      `b.status IN ${OPEN_STATUSES_SQL} AND b.next_follow_up_date <= ${EAT_TODAY_SQL}`
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = filters.due
    ? `ORDER BY b.next_follow_up_date ASC, b.created_at ASC`
    : `ORDER BY b.created_at DESC`;
  return query<BookingWithNames>(
    `SELECT ${SELECT_WITH_NAMES}
     FROM bookings b
     LEFT JOIN staff s ON s.id = b.assigned_staff_id
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN patients p ON p.id = b.patient_id
     ${where}
     ${order}`,
    params
  );
}

export async function getBookingById(id: string): Promise<BookingWithNames | null> {
  return queryOne<BookingWithNames>(
    `SELECT ${SELECT_WITH_NAMES}
     FROM bookings b
     LEFT JOIN staff s ON s.id = b.assigned_staff_id
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN patients p ON p.id = b.patient_id
     WHERE b.id = $1`,
    [id]
  );
}

export async function updateBooking(
  id: string,
  patch: {
    status?: string;
    assignedStaffId?: string | null;
    patientId?: string | null;
    notes?: string | null;
    source?: string | null;
    sourceDetail?: string | null;
    nextFollowUpDate?: string | null;
  },
  client?: Pick<PoolClient, "query">
): Promise<BookingRow | null> {
  // A closed request needs no more follow-up.
  const closing = patch.status === "COMPLETED" || patch.status === "CANCELLED";
  const columnMap: Record<string, unknown> = {
    status: patch.status,
    assigned_staff_id: patch.assignedStaffId,
    patient_id: patch.patientId,
    notes: patch.notes,
    source: patch.source,
    source_detail: patch.sourceDetail,
    next_follow_up_date: closing ? null : patch.nextFollowUpDate,
  };
  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }
  }
  const run = async (sql: string, values: unknown[]) => {
    if (client) {
      const res = await client.query<BookingRow>(sql, values);
      return res.rows[0] ?? null;
    }
    return queryOne<BookingRow>(sql, values);
  };
  if (fields.length === 0) {
    return run(`SELECT * FROM bookings WHERE id = $1`, [id]);
  }
  params.push(id);
  return run(
    `UPDATE bookings SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

export async function countNewBookings(): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM bookings WHERE status = 'NEW'`
  );
  return parseInt(row?.count ?? "0", 10);
}

/** New requests plus open ones whose follow-up is due: what the badge shows. */
export async function countBookingsNeedingAction(): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM bookings
     WHERE status = 'NEW'
        OR (status IN ${OPEN_STATUSES_SQL} AND next_follow_up_date <= ${EAT_TODAY_SQL})`
  );
  return parseInt(row?.count ?? "0", 10);
}

export async function deleteBooking(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM bookings WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

// ---------------- Follow-up log ----------------

export async function listFollowUps(bookingId: string): Promise<BookingFollowUpRow[]> {
  return query<BookingFollowUpRow>(
    `SELECT f.*, u.full_name AS created_by_name
     FROM booking_followups f
     LEFT JOIN users u ON u.id = f.created_by_id
     WHERE f.booking_id = $1
     ORDER BY f.created_at DESC`,
    [bookingId]
  );
}

export async function insertFollowUp(
  client: Pick<PoolClient, "query">,
  input: {
    bookingId: string;
    channel: string;
    note: string;
    nextFollowUpDate: string | null;
    createdById: string;
  }
): Promise<{ id: string }> {
  const res = await client.query<{ id: string }>(
    `INSERT INTO booking_followups (booking_id, channel, note, next_follow_up_date, created_by_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.bookingId, input.channel, input.note, input.nextFollowUpDate, input.createdById]
  );
  return res.rows[0];
}

/** Open requests due today or earlier, oldest first (for the morning reminder). */
export async function listDueFollowUps(): Promise<
  { id: string; full_name: string; next_follow_up_date: string; overdue: boolean }[]
> {
  return query(
    `SELECT id, full_name, next_follow_up_date,
            next_follow_up_date < ${EAT_TODAY_SQL} AS overdue
     FROM bookings
     WHERE status IN ${OPEN_STATUSES_SQL} AND next_follow_up_date <= ${EAT_TODAY_SQL}
     ORDER BY next_follow_up_date ASC, created_at ASC`
  );
}

export interface BookingStats {
  dueToday: number;
  overdue: number;
  thisMonth: number;
  convertedThisMonth: number;
  bySource: { source: string | null; total: number; converted: number }[];
}

/** This calendar month in Dar es Salaam: requests and how many became patients, by source. */
export async function getBookingStats(): Promise<BookingStats> {
  const monthStart = `date_trunc('month', ${EAT_TODAY_SQL})`;
  const createdEat = `(b.created_at AT TIME ZONE 'Africa/Dar_es_Salaam')::date`;
  const [due, bySource] = await Promise.all([
    queryOne<{ due_today: string; overdue: string }>(
      `SELECT COUNT(*) FILTER (WHERE next_follow_up_date = ${EAT_TODAY_SQL})::text AS due_today,
              COUNT(*) FILTER (WHERE next_follow_up_date < ${EAT_TODAY_SQL})::text AS overdue
       FROM bookings WHERE status IN ${OPEN_STATUSES_SQL}`
    ),
    query<{ source: string | null; total: string; converted: string }>(
      `SELECT b.source, COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE b.patient_id IS NOT NULL)::text AS converted
       FROM bookings b
       WHERE ${createdEat} >= ${monthStart}
       GROUP BY b.source
       ORDER BY COUNT(*) DESC`
    ),
  ]);
  const rows = bySource.map((r) => ({
    source: r.source,
    total: Number(r.total),
    converted: Number(r.converted),
  }));
  return {
    dueToday: Number(due?.due_today ?? 0),
    overdue: Number(due?.overdue ?? 0),
    thisMonth: rows.reduce((s, r) => s + r.total, 0),
    convertedThisMonth: rows.reduce((s, r) => s + r.converted, 0),
    bySource: rows,
  };
}
