import { query, queryOne } from "../db";
import type { ManualReceiptRow } from "../types";

/**
 * Stand-alone printable receipts, kept in their own table on purpose.
 * NEVER sum manual_receipts.amount into any finance/income query — these
 * are explicitly outside the revenue reporting pipeline (see
 * prisma/init.sql comment on the table).
 */

async function nextReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM manual_receipts
     WHERE EXTRACT(YEAR FROM issued_at) = $1`,
    [year]
  );
  const seq = parseInt(row?.count ?? "0", 10) + 1;
  return `RCT-${year}-${String(seq).padStart(4, "0")}`;
}

/** A caller-supplied receipt number collided with an existing one. */
export class DuplicateReceiptNumberError extends Error {
  constructor() {
    super("DUPLICATE_RECEIPT_NUMBER");
  }
}

export async function createManualReceipt(input: {
  receiptNumber: string | null;
  issuedAt: string | null;
  clientName: string;
  phone: string | null;
  amount: string;
  method: string;
  reference: string | null;
  description: string | null;
  issuedById: string;
}): Promise<ManualReceiptRow> {
  const receiptNumber = input.receiptNumber ?? (await nextReceiptNumber());
  try {
    const row = await queryOne<ManualReceiptRow>(
      `INSERT INTO manual_receipts
         (receipt_number, issued_at, client_name, phone, amount, method, reference, description, issued_by_id)
       VALUES ($1, COALESCE($2::timestamptz, now()), $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        receiptNumber,
        input.issuedAt,
        input.clientName,
        input.phone,
        input.amount,
        input.method,
        input.reference,
        input.description,
        input.issuedById,
      ]
    );
    if (!row) throw new Error("Imeshindwa kutengeneza risiti");
    return row;
  } catch (err) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") throw new DuplicateReceiptNumberError();
    throw err;
  }
}

export interface ManualReceiptWithIssuer extends ManualReceiptRow {
  issued_by_name: string;
}

export async function listManualReceipts(): Promise<ManualReceiptWithIssuer[]> {
  return query<ManualReceiptWithIssuer>(
    `SELECT mr.*, u.full_name AS issued_by_name
     FROM manual_receipts mr
     JOIN users u ON u.id = mr.issued_by_id
     ORDER BY mr.issued_at DESC`
  );
}

export async function getManualReceiptById(
  id: string
): Promise<ManualReceiptWithIssuer | null> {
  return queryOne<ManualReceiptWithIssuer>(
    `SELECT mr.*, u.full_name AS issued_by_name
     FROM manual_receipts mr
     JOIN users u ON u.id = mr.issued_by_id
     WHERE mr.id = $1`,
    [id]
  );
}
