import { query, queryOne, withTransaction } from "../db";
import type {
  PatientDocumentRow,
  PatientMedicationRow,
  PatientRow,
} from "../types";

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
  const row = await queryOne<PatientRow>(
    `INSERT INTO patients
       (full_name, date_of_birth, gender, phone, email, address,
        emergency_contact_name, emergency_contact_phone, blood_type,
        allergies, chronic_conditions, notes, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
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

export async function listPatients(search?: string): Promise<PatientRow[]> {
  if (search) {
    return query<PatientRow>(
      `SELECT * FROM patients WHERE full_name ILIKE $1 ORDER BY full_name ASC`,
      [`%${search}%`]
    );
  }
  return query<PatientRow>(`SELECT * FROM patients ORDER BY full_name ASC`);
}

export async function getPatientById(id: string): Promise<PatientRow | null> {
  return queryOne<PatientRow>(`SELECT * FROM patients WHERE id = $1`, [id]);
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
