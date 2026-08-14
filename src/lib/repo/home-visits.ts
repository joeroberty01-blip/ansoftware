import { query, queryOne } from "../db";
import type { HomeVisitRow } from "../types";

export interface HomeVisitStatusCounts {
  scheduled: number;
  completed: number;
  cancelled: number;
}

export async function getHomeVisitStatusCounts(): Promise<HomeVisitStatusCounts> {
  const rows = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM home_visits GROUP BY status`
  );
  const counts: HomeVisitStatusCounts = { scheduled: 0, completed: 0, cancelled: 0 };
  for (const row of rows) {
    const n = parseInt(row.count, 10);
    if (row.status === "SCHEDULED") counts.scheduled = n;
    else if (row.status === "COMPLETED") counts.completed = n;
    else if (row.status === "CANCELLED") counts.cancelled = n;
  }
  return counts;
}

export interface HomeVisitWithNames extends HomeVisitRow {
  patient_name: string;
  staff_name: string | null;
}

const SELECT_WITH_NAMES = `
  hv.*,
  p.full_name AS patient_name,
  u.full_name AS staff_name
`;

export async function createHomeVisit(input: {
  patientId: string;
  staffId: string | null;
  visitDate: string;
  status: string;
  location: string | null;
  bloodPressure: string | null;
  temperature: string | null;
  pulse: number | null;
  weight: string | null;
  treatmentNotes: string | null;
  notes: string | null;
  createdById: string;
}): Promise<HomeVisitRow> {
  const row = await queryOne<HomeVisitRow>(
    `INSERT INTO home_visits
       (patient_id, staff_id, visit_date, status, location, blood_pressure, temperature,
        pulse, weight, treatment_notes, notes, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.patientId,
      input.staffId,
      input.visitDate,
      input.status,
      input.location,
      input.bloodPressure,
      input.temperature,
      input.pulse,
      input.weight,
      input.treatmentNotes,
      input.notes,
      input.createdById,
    ]
  );
  if (!row) throw new Error("Imeshindwa kurekodi home visit");
  return row;
}

export async function listHomeVisits(filters: {
  patientId?: string;
  staffId?: string;
  status?: string;
  visitDate?: string;
}): Promise<HomeVisitWithNames[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.patientId) {
    params.push(filters.patientId);
    conditions.push(`hv.patient_id = $${params.length}`);
  }
  if (filters.staffId) {
    params.push(filters.staffId);
    conditions.push(`hv.staff_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`hv.status = $${params.length}`);
  }
  if (filters.visitDate) {
    params.push(filters.visitDate);
    conditions.push(`hv.visit_date = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return query<HomeVisitWithNames>(
    `SELECT ${SELECT_WITH_NAMES}
     FROM home_visits hv
     JOIN patients p ON p.id = hv.patient_id
     LEFT JOIN staff s ON s.id = hv.staff_id
     LEFT JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY hv.visit_date DESC, hv.created_at DESC`,
    params
  );
}

export async function getHomeVisitById(
  id: string
): Promise<HomeVisitWithNames | null> {
  return queryOne<HomeVisitWithNames>(
    `SELECT ${SELECT_WITH_NAMES}
     FROM home_visits hv
     JOIN patients p ON p.id = hv.patient_id
     LEFT JOIN staff s ON s.id = hv.staff_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE hv.id = $1`,
    [id]
  );
}

/** Visits still SCHEDULED whose date has already passed — a real, computable "missed" signal. */
export async function countMissedVisits(): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM home_visits
     WHERE status = 'SCHEDULED' AND visit_date < CURRENT_DATE`
  );
  return parseInt(row?.count ?? "0", 10);
}

export interface StaffVisitLeaderboardRow {
  staff_id: string;
  staff_name: string;
  completed_count: string;
}

/** Top staff by completed home visits in the last `days` days. */
export async function getStaffVisitLeaderboard(
  days: number,
  limit = 5
): Promise<StaffVisitLeaderboardRow[]> {
  return query<StaffVisitLeaderboardRow>(
    `SELECT s.id AS staff_id, u.full_name AS staff_name, COUNT(hv.id)::text AS completed_count
     FROM home_visits hv
     JOIN staff s ON s.id = hv.staff_id
     JOIN users u ON u.id = s.user_id
     WHERE hv.status = 'COMPLETED'
       AND hv.visit_date >= CURRENT_DATE - $1::int
     GROUP BY s.id, u.full_name
     ORDER BY COUNT(hv.id) DESC
     LIMIT $2`,
    [days, limit]
  );
}

export async function deleteHomeVisit(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM home_visits WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}

export async function updateHomeVisit(
  id: string,
  patch: {
    status?: string;
    location?: string | null;
    bloodPressure?: string | null;
    temperature?: string | null;
    pulse?: number | null;
    weight?: string | null;
    treatmentNotes?: string | null;
    notes?: string | null;
  }
): Promise<HomeVisitRow | null> {
  const columnMap: Record<string, unknown> = {
    status: patch.status,
    location: patch.location,
    blood_pressure: patch.bloodPressure,
    temperature: patch.temperature,
    pulse: patch.pulse,
    weight: patch.weight,
    treatment_notes: patch.treatmentNotes,
    notes: patch.notes,
  };

  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return queryOne<HomeVisitRow>(`SELECT * FROM home_visits WHERE id = $1`, [id]);
  }

  params.push(id);
  return queryOne<HomeVisitRow>(
    `UPDATE home_visits SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}
