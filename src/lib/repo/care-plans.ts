import { query, queryOne, withTransaction } from "../db";
import type { CarePlanRow } from "../types";

export interface CarePlanWithNames extends CarePlanRow {
  patient_name: string;
  staff_name: string | null;
}

const SELECT_WITH_NAMES = `
  cp.*,
  p.full_name AS patient_name,
  u.full_name AS staff_name
`;

export async function createCarePlan(input: {
  patientId: string;
  staffId: string | null;
  frequency: string;
  weekdays: number[] | null;
  sessions: string[];
  startDate: string;
  endDate: string;
  notes: string | null;
  createdById: string;
}): Promise<CarePlanRow> {
  const row = await queryOne<CarePlanRow>(
    `INSERT INTO care_plans
       (patient_id, staff_id, frequency, weekdays, sessions, start_date, end_date, notes, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.patientId,
      input.staffId,
      input.frequency,
      input.weekdays,
      input.sessions,
      input.startDate,
      input.endDate,
      input.notes,
      input.createdById,
    ]
  );
  if (!row) throw new Error("Imeshindwa kutengeneza care plan");
  return row;
}

export async function listCarePlansForPatient(
  patientId: string
): Promise<CarePlanWithNames[]> {
  return query<CarePlanWithNames>(
    `SELECT ${SELECT_WITH_NAMES}
     FROM care_plans cp
     JOIN patients p ON p.id = cp.patient_id
     LEFT JOIN staff s ON s.id = cp.staff_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE cp.patient_id = $1
     ORDER BY cp.created_at DESC`,
    [patientId]
  );
}

export async function getCarePlanById(id: string): Promise<CarePlanWithNames | null> {
  return queryOne<CarePlanWithNames>(
    `SELECT ${SELECT_WITH_NAMES}
     FROM care_plans cp
     JOIN patients p ON p.id = cp.patient_id
     LEFT JOIN staff s ON s.id = cp.staff_id
     LEFT JOIN users u ON u.id = s.user_id
     WHERE cp.id = $1`,
    [id]
  );
}

export async function updateCarePlanStatus(
  id: string,
  status: string
): Promise<CarePlanRow | null> {
  return queryOne<CarePlanRow>(
    `UPDATE care_plans SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status]
  );
}

/**
 * Reads the plan's rule and inserts SCHEDULED home_visits for each matching
 * day in [start_date, end_date] x sessions — skipping any (patient, date,
 * session) combination that already has a visit, so calling this again
 * (e.g. after the plan's dates were extended) never creates duplicates.
 */
export async function generateVisitsForCarePlan(
  id: string,
  createdById: string
): Promise<{ created: number; skipped: number }> {
  const plan = await getCarePlanById(id);
  if (!plan) throw new Error("NOT_FOUND");
  if (plan.status !== "ACTIVE") throw new Error("NOT_ACTIVE");

  const start = new Date(`${plan.start_date}T00:00:00Z`);
  const end = new Date(`${plan.end_date}T00:00:00Z`);
  const weekdaySet = plan.weekdays ? new Set(plan.weekdays) : null;

  const dates: string[] = [];
  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    if (plan.frequency === "WEEKLY" && weekdaySet && !weekdaySet.has(d.getUTCDay())) {
      continue;
    }
    dates.push(d.toISOString().slice(0, 10));
  }

  return withTransaction(async (client) => {
    let created = 0;
    let skipped = 0;
    for (const date of dates) {
      for (const session of plan.sessions) {
        const existing = await client.query(
          `SELECT id FROM home_visits WHERE patient_id = $1 AND visit_date = $2 AND visit_session = $3`,
          [plan.patient_id, date, session]
        );
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }
        await client.query(
          `INSERT INTO home_visits
             (patient_id, staff_id, visit_date, visit_session, status, care_plan_id, created_by_id)
           VALUES ($1, $2, $3, $4, 'SCHEDULED', $5, $6)`,
          [plan.patient_id, plan.staff_id, date, session, plan.id, createdById]
        );
        created++;
      }
    }
    return { created, skipped };
  });
}
