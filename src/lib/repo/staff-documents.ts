import { query, queryOne } from "../db";

export interface StaffDocumentRow {
  id: string;
  staff_id: string;
  title: string;
  document_type: string;
  file_url: string;
  uploaded_by_id: string;
  created_at: string;
}

export async function listStaffDocuments(
  staffId: string
): Promise<StaffDocumentRow[]> {
  return query<StaffDocumentRow>(
    `SELECT * FROM staff_documents WHERE staff_id = $1 ORDER BY created_at DESC`,
    [staffId]
  );
}

export async function addStaffDocument(input: {
  staffId: string;
  title: string;
  documentType: string;
  fileUrl: string;
  uploadedById: string;
}): Promise<StaffDocumentRow> {
  const row = await queryOne<StaffDocumentRow>(
    `INSERT INTO staff_documents (staff_id, title, document_type, file_url, uploaded_by_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.staffId, input.title, input.documentType, input.fileUrl, input.uploadedById]
  );
  if (!row) throw new Error("Imeshindwa kupakia hati");
  return row;
}

export async function deleteStaffDocument(id: string): Promise<boolean> {
  const rows = await query(
    `DELETE FROM staff_documents WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows.length > 0;
}
