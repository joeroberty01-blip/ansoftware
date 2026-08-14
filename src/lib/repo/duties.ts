import { query, queryOne } from "../db";
import type { StaffDutyRow } from "../types";

export async function createDuty(input: {
  staffId: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  assignedById: string;
}): Promise<StaffDutyRow> {
  const row = await queryOne<StaffDutyRow>(
    `INSERT INTO staff_duties (staff_id, title, description, due_date, assigned_by_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.staffId, input.title, input.description, input.dueDate, input.assignedById]
  );
  if (!row) throw new Error("Imeshindwa kuongeza jukumu");
  return row;
}

export async function listDutiesForStaff(
  staffId: string
): Promise<StaffDutyRow[]> {
  return query<StaffDutyRow>(
    `SELECT * FROM staff_duties WHERE staff_id = $1 ORDER BY created_at DESC`,
    [staffId]
  );
}

export async function getDutyById(id: string): Promise<StaffDutyRow | null> {
  return queryOne<StaffDutyRow>(`SELECT * FROM staff_duties WHERE id = $1`, [id]);
}

export async function updateDuty(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    status?: string;
    dueDate?: string | null;
  }
): Promise<StaffDutyRow | null> {
  const columnMap: Record<string, unknown> = {
    title: patch.title,
    description: patch.description,
    status: patch.status,
    due_date: patch.dueDate,
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
    return getDutyById(id);
  }

  params.push(id);
  return queryOne<StaffDutyRow>(
    `UPDATE staff_duties SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

export async function deleteDuty(id: string): Promise<boolean> {
  const rows = await query(`DELETE FROM staff_duties WHERE id = $1 RETURNING id`, [id]);
  return rows.length > 0;
}
