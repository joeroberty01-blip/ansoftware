import { query, queryOne, withTransaction } from "../db";
import type {
  PatientDocumentRow,
  PatientMedicationRow,
  PatientRow,
} from "../types";

export async function nextPatientNumber(): Promise<string> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM patients`
  );
  const seq = parseInt(rows[0]?.count ?? "0", 10) + 1;
  return `AN-${String(seq).padStart(6, "0")}`;
}

export async function createPatient(input: {
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodType: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  notes: string | null;
  createdById: string;
}): Promise<PatientRow> {
  const patientNumber = await nextPatientNumber();
  const row = await queryOne<PatientRow>(
    `INSERT INTO patients
       (patient_number, full_name, date_of_birth, gender, phone, email, address,
        emergency_contact_name, emergency_contact_phone, blood_type,
        allergies, chronic_conditions, notes, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      patientNumber,
      input.fullName,
      input.dateOfBirth,
      input.gender,
      input.phone,
      input.email,
      input.address,
      input.emergencyContactName,
      input.emergencyContactPhone,
      input.bloodType,
      input.allergies,
      input.chronicConditions,
      input.notes,
      input.createdById,
    ]
  );
  if (!row) throw new Error("Imeshindwa kuongeza mgonjwa");
  return row;
}

export async function countPatients(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM patients`
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

export async function countNewPatientsThisMonth(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM patients
     WHERE created_at >= date_trunc('month', CURRENT_DATE)`
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

/** "Active" here means seen on a home visit in the last 30 days — the only
 * real signal we have, since patients has no explicit active/discharged
 * status field. */
export async function countActivePatients(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(DISTINCT patient_id)::text AS count FROM home_visits
     WHERE visit_date >= CURRENT_DATE - 30`
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

export interface PatientWithAssignment extends PatientRow {
  assigned_staff_name: string | null;
}

const PATIENT_SELECT_WITH_ASSIGNMENT = `
  p.*,
  su.full_name AS assigned_staff_name
`;

export async function listPatients(filters?: {
  search?: string;
  assignedStaffId?: string;
}): Promise<PatientWithAssignment[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`p.full_name ILIKE $${params.length}`);
  }
  if (filters?.assignedStaffId) {
    params.push(filters.assignedStaffId);
    conditions.push(`p.assigned_staff_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return query<PatientWithAssignment>(
    `SELECT ${PATIENT_SELECT_WITH_ASSIGNMENT}
     FROM patients p
     LEFT JOIN staff s ON s.id = p.assigned_staff_id
     LEFT JOIN users su ON su.id = s.user_id
     ${where}
     ORDER BY p.full_name ASC`,
    params
  );
}

export async function getPatientById(
  id: string
): Promise<PatientWithAssignment | null> {
  return queryOne<PatientWithAssignment>(
    `SELECT ${PATIENT_SELECT_WITH_ASSIGNMENT}
     FROM patients p
     LEFT JOIN staff s ON s.id = p.assigned_staff_id
     LEFT JOIN users su ON su.id = s.user_id
     WHERE p.id = $1`,
    [id]
  );
}

export async function updatePatient(
  id: string,
  patch: {
    fullName?: string;
    dateOfBirth?: string | null;
    gender?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    bloodType?: string | null;
    allergies?: string | null;
    chronicConditions?: string | null;
    notes?: string | null;
    assignedStaffId?: string | null;
    photoUrl?: string | null;
  }
): Promise<PatientRow | null> {
  const columnMap: Record<string, unknown> = {
    full_name: patch.fullName,
    date_of_birth: patch.dateOfBirth,
    gender: patch.gender,
    phone: patch.phone,
    email: patch.email,
    address: patch.address,
    emergency_contact_name: patch.emergencyContactName,
    emergency_contact_phone: patch.emergencyContactPhone,
    blood_type: patch.bloodType,
    allergies: patch.allergies,
    chronic_conditions: patch.chronicConditions,
    notes: patch.notes,
    assigned_staff_id: patch.assignedStaffId,
    photo_url: patch.photoUrl,
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
    return getPatientById(id);
  }

  params.push(id);
  return queryOne<PatientRow>(
    `UPDATE patients SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

/**
 * Deletes a patient permanently. patient_medications and patient_documents
 * cascade at the DB level; home_visits does not (it has no ON DELETE
 * clause on patient_id, by design — visits are clinical history), so we
 * remove those explicitly here in the same transaction.
 */
export async function deletePatient(id: string): Promise<boolean> {
  return withTransaction(async (client) => {
    await client.query(`DELETE FROM home_visits WHERE patient_id = $1`, [id]);
    const res = await client.query(
      `DELETE FROM patients WHERE id = $1 RETURNING id`,
      [id]
    );
    return res.rows.length > 0;
  });
}

export async function addMedication(input: {
  patientId: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}): Promise<PatientMedicationRow> {
  const row = await queryOne<PatientMedicationRow>(
    `INSERT INTO patient_medications
       (patient_id, medication_name, dosage, frequency, start_date, end_date, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.patientId,
      input.medicationName,
      input.dosage,
      input.frequency,
      input.startDate,
      input.endDate,
      input.notes,
    ]
  );
  if (!row) throw new Error("Imeshindwa kuongeza dawa");
  return row;
}

export async function listMedications(
  patientId: string
): Promise<PatientMedicationRow[]> {
  return query<PatientMedicationRow>(
    `SELECT * FROM patient_medications WHERE patient_id = $1 ORDER BY created_at DESC`,
    [patientId]
  );
}

export async function addDocument(input: {
  patientId: string;
  title: string;
  documentType: string;
  notes: string | null;
  uploadedById: string;
}): Promise<PatientDocumentRow> {
  const row = await queryOne<PatientDocumentRow>(
    `INSERT INTO patient_documents (patient_id, title, document_type, notes, uploaded_by_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.patientId, input.title, input.documentType, input.notes, input.uploadedById]
  );
  if (!row) throw new Error("Imeshindwa kuongeza document");
  return row;
}

export async function listDocuments(
  patientId: string
): Promise<PatientDocumentRow[]> {
  return query<PatientDocumentRow>(
    `SELECT * FROM patient_documents WHERE patient_id = $1 ORDER BY created_at DESC`,
    [patientId]
  );
}

export interface PatientDocumentWithNames extends PatientDocumentRow {
  patient_name: string;
  uploaded_by_name: string;
}

/**
 * All documents across all patients, joined with patient/uploader names.
 * `staffId` scopes results to that staff member's assigned patients only
 * (used for non-admin viewers of the cross-patient Documents hub).
 */
export async function listAllDocuments(filters?: {
  staffId?: string;
  search?: string;
}): Promise<PatientDocumentWithNames[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.staffId) {
    params.push(filters.staffId);
    conditions.push(`p.assigned_staff_id = $${params.length}`);
  }
  if (filters?.search) {
    params.push(`%${filters.search}%`);
    conditions.push(
      `(p.full_name ILIKE $${params.length} OR d.title ILIKE $${params.length})`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return query<PatientDocumentWithNames>(
    `SELECT d.*, p.full_name AS patient_name, u.full_name AS uploaded_by_name
     FROM patient_documents d
     JOIN patients p ON p.id = d.patient_id
     JOIN users u ON u.id = d.uploaded_by_id
     ${where}
     ORDER BY d.created_at DESC`,
    params
  );
}
