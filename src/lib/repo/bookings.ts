import { query, queryOne } from "../db";
import type { BookingRow } from "../types";

export interface BookingWithNames extends BookingRow {
  staff_name: string | null;
  patient_name: string | null;
}

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
}): Promise<BookingRow> {
  const row = await queryOne<BookingRow>(
    `INSERT INTO bookings (full_name, phone, service_type, preferred_date, notes, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.fullName,
      input.phone,
      input.serviceType,
      input.preferredDate,
      input.notes,
      input.createdById,
    ]
  );
  if (!row) throw new Error("Imeshindwa kutengeneza booking");
  return row;
}

export async function listBookings(filters: {
  status?: string;
}): Promise<BookingWithNames[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`b.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return query<BookingWithNames>(
    `SELECT ${SELECT_WITH_NAMES}
     FROM bookings b
     LEFT JOIN staff s ON s.id = b.assigned_staff_id
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN patients p ON p.id = b.patient_id
     ${where}
     ORDER BY b.created_at DESC`,
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
  }
): Promise<BookingRow | null> {
  const columnMap: Record<string, unknown> = {
    status: patch.status,
    assigned_staff_id: patch.assignedStaffId,
    patient_id: patch.patientId,
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
    return queryOne<BookingRow>(`SELECT * FROM bookings WHERE id = $1`, [id]);
  }
  params.push(id);
  return queryOne<BookingRow>(
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

export async function deleteBooking(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM bookings WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}
