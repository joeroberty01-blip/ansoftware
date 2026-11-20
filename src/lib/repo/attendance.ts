import { query, queryOne, withTransaction } from "../db";
import { distanceMeters } from "../geo";

/** Today's date and the time now in Dar es Salaam, computed by Postgres. */
const EAT = `'Africa/Dar_es_Salaam'`;
const EAT_TODAY = `(now() AT TIME ZONE ${EAT})::date`;

const SHIFT_START_KEY = "attendance_shift_start";
export const DEFAULT_SHIFT_START = "07:00";

export async function getShiftStart(): Promise<string> {
  const row = await queryOne<{ value: string | null }>(
    `SELECT value FROM app_settings WHERE key = $1`,
    [SHIFT_START_KEY]
  );
  const v = row?.value ?? "";
  return /^\d{2}:\d{2}$/.test(v) ? v : DEFAULT_SHIFT_START;
}

export async function setShiftStart(value: string): Promise<void> {
  await query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
    [SHIFT_START_KEY, value]
  );
}

export interface AttendanceRow {
  id: string;
  staff_id: string;
  patient_id: string | null;
  work_date: string;
  check_in_at: string;
  check_in_lat: string;
  check_in_lng: string;
  check_in_accuracy_m: string | null;
  check_in_distance_m: number | null;
  late_minutes: number;
  check_out_at: string | null;
  check_out_lat: string | null;
  check_out_lng: string | null;
  check_out_accuracy_m: string | null;
  check_out_distance_m: number | null;
}

export interface AttendanceWithNames extends AttendanceRow {
  staff_name: string;
  staff_number: string | null;
  patient_name: string | null;
  patient_home_lat: string | null;
  patient_home_lng: string | null;
  has_photo: boolean;
  minutes_worked: number | null;
}

const SELECT_WITH_NAMES = `
  a.*,
  u.full_name AS staff_name,
  s.staff_number,
  p.full_name AS patient_name,
  p.home_lat AS patient_home_lat,
  p.home_lng AS patient_home_lng,
  EXISTS (SELECT 1 FROM staff_attendance_photos ph WHERE ph.attendance_id = a.id) AS has_photo,
  CASE WHEN a.check_out_at IS NULL THEN NULL
       ELSE ROUND(EXTRACT(EPOCH FROM a.check_out_at - a.check_in_at) / 60)::int END AS minutes_worked
`;

const FROM_WITH_NAMES = `
  FROM staff_attendance a
  JOIN staff s ON s.id = a.staff_id
  JOIN users u ON u.id = s.user_id
  LEFT JOIN patients p ON p.id = a.patient_id
`;

export async function getOpenAttendance(staffId: string): Promise<AttendanceWithNames | null> {
  return queryOne<AttendanceWithNames>(
    `SELECT ${SELECT_WITH_NAMES} ${FROM_WITH_NAMES}
     WHERE a.staff_id = $1 AND a.check_out_at IS NULL
     ORDER BY a.check_in_at DESC LIMIT 1`,
    [staffId]
  );
}

export async function listAttendanceForStaffToday(staffId: string): Promise<AttendanceWithNames[]> {
  return query<AttendanceWithNames>(
    `SELECT ${SELECT_WITH_NAMES} ${FROM_WITH_NAMES}
     WHERE a.staff_id = $1 AND a.work_date = ${EAT_TODAY}
     ORDER BY a.check_in_at ASC`,
    [staffId]
  );
}

/** True when this staff member checked in for this patient today (Dar es Salaam). */
export async function hasCheckInToday(staffId: string, patientId: string): Promise<boolean> {
  const row = await queryOne<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM staff_attendance
       WHERE staff_id = $1 AND patient_id = $2 AND work_date = ${EAT_TODAY}
     ) AS ok`,
    [staffId, patientId]
  );
  return !!row?.ok;
}

export async function eatToday(): Promise<string> {
  const row = await queryOne<{ d: string }>(`SELECT ${EAT_TODAY}::text AS d`);
  return row!.d;
}

export class AttendanceError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/**
 * Opens a shift. Distance is measured to the patient's saved home; lateness
 * counts only for the staff member's first check-in of the day.
 */
export async function checkIn(input: {
  staffId: string;
  patientId: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  photo: { mime: string; data: Buffer };
  userAgent: string | null;
}): Promise<AttendanceRow> {
  return withTransaction(async (client) => {
    const open = await client.query(
      `SELECT a.id, p.full_name FROM staff_attendance a
       LEFT JOIN patients p ON p.id = a.patient_id
       WHERE a.staff_id = $1 AND a.check_out_at IS NULL`,
      [input.staffId]
    );
    if (open.rows.length > 0) {
      throw new AttendanceError(
        `Bado uko kazini${open.rows[0].full_name ? ` kwa ${open.rows[0].full_name}` : ""}. Bonyeza "Naondoka" kwanza.`,
        409
      );
    }
    const home = await client.query<{ home_lat: string | null; home_lng: string | null }>(
      `SELECT home_lat, home_lng FROM patients WHERE id = $1`,
      [input.patientId]
    );
    const h = home.rows[0];
    const distance =
      h?.home_lat != null && h?.home_lng != null
        ? distanceMeters({ lat: input.lat, lng: input.lng }, { lat: Number(h.home_lat), lng: Number(h.home_lng) })
        : null;

    // Late = minutes after the shift start, for the day's first check-in.
    // More than 6 hours after it is taken as a later shift, not lateness.
    const late = await client.query<{ late: number }>(
      `WITH m AS (
         SELECT FLOOR(EXTRACT(EPOCH FROM ((now() AT TIME ZONE ${EAT})::time - $2::time)) / 60)::int AS mins
       )
       SELECT CASE
         WHEN EXISTS (SELECT 1 FROM staff_attendance WHERE staff_id = $1 AND work_date = ${EAT_TODAY}) THEN 0
         WHEN m.mins BETWEEN 1 AND 360 THEN m.mins
         ELSE 0
       END AS late FROM m`,
      [input.staffId, await getShiftStart()]
    );

    const inserted = await client.query<AttendanceRow>(
      `INSERT INTO staff_attendance
         (staff_id, patient_id, work_date, check_in_lat, check_in_lng, check_in_accuracy_m,
          check_in_distance_m, late_minutes, user_agent)
       VALUES ($1, $2, ${EAT_TODAY}, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        input.staffId,
        input.patientId,
        input.lat,
        input.lng,
        input.accuracyM,
        distance,
        late.rows[0]?.late ?? 0,
        input.userAgent,
      ]
    );
    const row = inserted.rows[0];
    await client.query(
      `INSERT INTO staff_attendance_photos (attendance_id, mime, data) VALUES ($1, $2, $3)`,
      [row.id, input.photo.mime, input.photo.data]
    );
    return row;
  });
}

export async function checkOut(input: {
  staffId: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
}): Promise<AttendanceRow> {
  const open = await getOpenAttendance(input.staffId);
  if (!open) throw new AttendanceError("Hujaingia kazini bado.", 409);
  const distance =
    open.patient_home_lat != null && open.patient_home_lng != null
      ? distanceMeters(
          { lat: input.lat, lng: input.lng },
          { lat: Number(open.patient_home_lat), lng: Number(open.patient_home_lng) }
        )
      : null;
  const row = await queryOne<AttendanceRow>(
    `UPDATE staff_attendance
     SET check_out_at = now(), check_out_lat = $2, check_out_lng = $3,
         check_out_accuracy_m = $4, check_out_distance_m = $5
     WHERE id = $1 AND check_out_at IS NULL
     RETURNING *`,
    [open.id, input.lat, input.lng, input.accuracyM, distance]
  );
  if (!row) throw new AttendanceError("Zamu hii tayari imefungwa.", 409);
  return row;
}

export async function getAttendanceById(id: string): Promise<AttendanceWithNames | null> {
  return queryOne<AttendanceWithNames>(
    `SELECT ${SELECT_WITH_NAMES} ${FROM_WITH_NAMES} WHERE a.id = $1`,
    [id]
  );
}

export async function getAttendancePhoto(
  id: string
): Promise<{ mime: string; data: Buffer } | null> {
  return queryOne<{ mime: string; data: Buffer }>(
    `SELECT mime, data FROM staff_attendance_photos WHERE attendance_id = $1`,
    [id]
  );
}

export async function listAttendanceByDate(date: string): Promise<AttendanceWithNames[]> {
  return query<AttendanceWithNames>(
    `SELECT ${SELECT_WITH_NAMES} ${FROM_WITH_NAMES}
     WHERE a.work_date = $1::date
     ORDER BY u.full_name ASC, a.check_in_at ASC`,
    [date]
  );
}

/** Active, approved field staff (not office staff) with no check-in that day. */
export async function listStaffWithoutCheckIn(
  date: string
): Promise<{ staff_id: string; full_name: string; profession: string }[]> {
  return query(
    `SELECT s.id AS staff_id, u.full_name, s.profession::text AS profession
     FROM staff s JOIN users u ON u.id = s.user_id
     WHERE u.status = 'APPROVED' AND s.employment_status = 'ACTIVE'
       AND s.profession <> 'ADMIN_STAFF'
       AND NOT EXISTS (SELECT 1 FROM staff_attendance a WHERE a.staff_id = s.id AND a.work_date = $1::date)
     ORDER BY u.full_name`,
    [date]
  );
}

export interface AttendanceMonthRow {
  staff_id: string;
  full_name: string;
  staff_number: string | null;
  days: number;
  shifts: number;
  minutes_worked: number;
  late_days: number;
  late_minutes: number;
  away_check_ins: number;
  no_home_check_ins: number;
  open_shifts: number;
}

/** One line per staff member for a calendar month (for payroll). */
export async function getMonthlySummary(
  year: number,
  month: number,
  nearMeters: number
): Promise<AttendanceMonthRow[]> {
  const rows = await query<Record<string, string>>(
    `SELECT s.id AS staff_id, u.full_name, s.staff_number,
            COUNT(DISTINCT a.work_date)::text AS days,
            COUNT(a.id)::text AS shifts,
            COALESCE(SUM(EXTRACT(EPOCH FROM a.check_out_at - a.check_in_at) / 60), 0)::int::text AS minutes_worked,
            COUNT(*) FILTER (WHERE a.late_minutes > 0)::text AS late_days,
            COALESCE(SUM(a.late_minutes), 0)::text AS late_minutes,
            COUNT(*) FILTER (WHERE a.check_in_distance_m > $3)::text AS away_check_ins,
            COUNT(*) FILTER (WHERE a.check_in_distance_m IS NULL)::text AS no_home_check_ins,
            COUNT(*) FILTER (WHERE a.check_out_at IS NULL)::text AS open_shifts
     FROM staff_attendance a
     JOIN staff s ON s.id = a.staff_id
     JOIN users u ON u.id = s.user_id
     WHERE a.work_date >= make_date($1, $2, 1)
       AND a.work_date < (make_date($1, $2, 1) + interval '1 month')
     GROUP BY s.id, u.full_name, s.staff_number
     ORDER BY u.full_name`,
    [year, month, nearMeters]
  );
  return rows.map((r) => ({
    staff_id: r.staff_id,
    full_name: r.full_name,
    staff_number: r.staff_number,
    days: Number(r.days),
    shifts: Number(r.shifts),
    minutes_worked: Number(r.minutes_worked),
    late_days: Number(r.late_days),
    late_minutes: Number(r.late_minutes),
    away_check_ins: Number(r.away_check_ins),
    no_home_check_ins: Number(r.no_home_check_ins),
    open_shifts: Number(r.open_shifts),
  }));
}

/**
 * Saves a patient's home location from a check-in the admin trusts, and
 * fills in the distance for that patient's check-ins that had none.
 */
export async function setPatientHomeFromAttendance(
  attendanceId: string,
  userId: string
): Promise<{ patientId: string } | null> {
  return withTransaction(async (client) => {
    const a = await client.query<{ patient_id: string | null; check_in_lat: string; check_in_lng: string }>(
      `SELECT patient_id, check_in_lat, check_in_lng FROM staff_attendance WHERE id = $1`,
      [attendanceId]
    );
    const row = a.rows[0];
    if (!row?.patient_id) return null;
    await client.query(
      `UPDATE patients SET home_lat = $2, home_lng = $3, home_location_set_at = now(),
              home_location_set_by = $4, updated_at = now()
       WHERE id = $1`,
      [row.patient_id, row.check_in_lat, row.check_in_lng, userId]
    );
    const home = { lat: Number(row.check_in_lat), lng: Number(row.check_in_lng) };
    const others = await client.query<{
      id: string;
      check_in_lat: string;
      check_in_lng: string;
      check_out_lat: string | null;
      check_out_lng: string | null;
    }>(
      `SELECT id, check_in_lat, check_in_lng, check_out_lat, check_out_lng
       FROM staff_attendance WHERE patient_id = $1 AND check_in_distance_m IS NULL`,
      [row.patient_id]
    );
    for (const o of others.rows) {
      const din = distanceMeters({ lat: Number(o.check_in_lat), lng: Number(o.check_in_lng) }, home);
      const dout =
        o.check_out_lat != null && o.check_out_lng != null
          ? distanceMeters({ lat: Number(o.check_out_lat), lng: Number(o.check_out_lng) }, home)
          : null;
      await client.query(
        `UPDATE staff_attendance SET check_in_distance_m = $2,
                check_out_distance_m = COALESCE(check_out_distance_m, $3)
         WHERE id = $1`,
        [o.id, din, dout]
      );
    }
    return { patientId: row.patient_id };
  });
}

/** Patients this staff member may check in for (same rule as patient access). */
export async function listPatientsForCheckIn(staff: {
  id: string;
  profession: string;
  is_chief_co: boolean;
}): Promise<{ id: string; full_name: string; address: string | null; has_home: boolean }[]> {
  const all = staff.profession === "ADMIN_STAFF" || staff.is_chief_co;
  return query(
    `SELECT id, full_name, address, (home_lat IS NOT NULL) AS has_home
     FROM patients
     ${all ? "" : "WHERE assigned_staff_id = $1"}
     ORDER BY full_name`,
    all ? [] : [staff.id]
  );
}
