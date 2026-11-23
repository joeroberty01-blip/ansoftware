import { query } from "@/lib/db";
import type { HomeVisitWithNames } from "./home-visits";

/**
 * Part-time visits are rows in home_visits with visit_type = 'PART_TIME'.
 * They are recorded by an Admin or the Chief C.O on behalf of the nurse who
 * made the visit, so this page reads and summarises them across all staff.
 */

export interface PartTimeVisitFilters {
  from: string; // inclusive, YYYY-MM-DD
  to: string; // exclusive, YYYY-MM-DD
  staffId?: string;
}

function whereFor(filters: PartTimeVisitFilters) {
  const params: unknown[] = [filters.from, filters.to];
  const conditions = [
    `hv.visit_type = 'PART_TIME'`,
    `hv.visit_date >= $1::date`,
    `hv.visit_date < $2::date`,
  ];
  if (filters.staffId) {
    params.push(filters.staffId);
    conditions.push(`hv.staff_id = $${params.length}`);
  }
  return { where: `WHERE ${conditions.join(" AND ")}`, params };
}

export async function listPartTimeVisits(
  filters: PartTimeVisitFilters
): Promise<HomeVisitWithNames[]> {
  const { where, params } = whereFor(filters);
  return query<HomeVisitWithNames>(
    `SELECT hv.*, p.full_name AS patient_name, u.full_name AS staff_name
     FROM home_visits hv
     JOIN patients p ON p.id = hv.patient_id
     LEFT JOIN staff s ON s.id = hv.staff_id
     LEFT JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY hv.visit_date DESC, hv.created_at DESC`,
    params
  );
}

export interface PartTimeStaffSummary {
  staff_id: string | null;
  staff_name: string | null;
  completed: number;
  scheduled: number;
  cancelled: number;
}

export async function summarisePartTimeVisitsByStaff(
  filters: PartTimeVisitFilters
): Promise<PartTimeStaffSummary[]> {
  const { where, params } = whereFor(filters);
  const rows = await query<{
    staff_id: string | null;
    staff_name: string | null;
    completed: string;
    scheduled: string;
    cancelled: string;
  }>(
    `SELECT hv.staff_id, u.full_name AS staff_name,
       COUNT(*) FILTER (WHERE hv.status = 'COMPLETED') AS completed,
       COUNT(*) FILTER (WHERE hv.status = 'SCHEDULED') AS scheduled,
       COUNT(*) FILTER (WHERE hv.status = 'CANCELLED') AS cancelled
     FROM home_visits hv
     LEFT JOIN staff s ON s.id = hv.staff_id
     LEFT JOIN users u ON u.id = s.user_id
     ${where}
     GROUP BY hv.staff_id, u.full_name
     ORDER BY COUNT(*) FILTER (WHERE hv.status = 'COMPLETED') DESC, u.full_name`,
    params
  );
  return rows.map((r) => ({
    staff_id: r.staff_id,
    staff_name: r.staff_name,
    completed: Number(r.completed),
    scheduled: Number(r.scheduled),
    cancelled: Number(r.cancelled),
  }));
}

export interface StaffOption {
  id: string;
  full_name: string;
}

export interface PatientOption {
  id: string;
  full_name: string;
  address: string | null;
}

/**
 * Every patient: part-time visits are recorded by the Admin or Chief C.O,
 * who are not limited to the patients assigned to them.
 */
export async function listPatientOptions(): Promise<PatientOption[]> {
  return query<PatientOption>(
    `SELECT id, full_name, address FROM patients ORDER BY full_name`
  );
}

/** Approved, active staff who can be named as the nurse on a visit. */
export async function listActiveStaffOptions(): Promise<StaffOption[]> {
  return query<StaffOption>(
    `SELECT s.id, u.full_name
     FROM staff s
     JOIN users u ON u.id = s.user_id
     WHERE u.status = 'APPROVED' AND s.employment_status = 'ACTIVE'
     ORDER BY u.full_name`
  );
}
