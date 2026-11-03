import { query, queryOne } from "../db";
import type { ClientRow } from "../types";

export async function createClient(input: {
  name: string;
  phone: string;
  email: string | null;
  type: string;
  address: string | null;
}): Promise<ClientRow> {
  const row = await queryOne<ClientRow>(
    `INSERT INTO clients (name, phone, email, type, address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.name, input.phone, input.email, input.type, input.address]
  );
  if (!row) throw new Error("Imeshindwa kutengeneza client");
  return row;
}

export async function listClients(): Promise<ClientRow[]> {
  return query<ClientRow>(`SELECT * FROM clients ORDER BY name ASC`);
}

export async function getClientById(id: string): Promise<ClientRow | null> {
  return queryOne<ClientRow>(`SELECT * FROM clients WHERE id = $1`, [id]);
}

export async function updateClient(
  id: string,
  patch: {
    name?: string;
    phone?: string;
    email?: string | null;
    type?: string;
    address?: string | null;
  }
): Promise<ClientRow | null> {
  const columnMap: Record<string, unknown> = {
    name: patch.name,
    phone: patch.phone,
    email: patch.email,
    type: patch.type,
    address: patch.address,
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
    return getClientById(id);
  }

  params.push(id);
  return queryOne<ClientRow>(
    `UPDATE clients SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

/** Blocked if any invoice references this client — same "no history loss" policy as elsewhere. */
export async function deleteClient(id: string): Promise<void> {
  const client = await getClientById(id);
  if (!client) throw new Error("NOT_FOUND");

  const invoiceCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM invoices WHERE client_id = $1`,
    [id]
  );
  if (Number(invoiceCount?.count ?? "0") > 0) {
    throw new Error("HAS_INVOICES");
  }

  await query(`DELETE FROM clients WHERE id = $1`, [id]);
}

export interface ClientPaymentHistoryRow {
  id: string;
  receipt_number: string;
  balance_after: string;
  amount: string;
  method: string;
  reference: string | null;
  paid_at: string;
  invoice_id: string;
  document_number: string;
}

export async function listPaymentsForClient(
  clientId: string
): Promise<ClientPaymentHistoryRow[]> {
  return query<ClientPaymentHistoryRow>(
    `SELECT p.id, p.receipt_number, p.amount, p.method, p.reference, p.paid_at,
            (i.total_amount - pt.paid_to_date) AS balance_after,
            i.id AS invoice_id, i.document_number
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     JOIN LATERAL (
       SELECT COALESCE(SUM(p2.amount), 0) AS paid_to_date
       FROM payments p2
       WHERE p2.invoice_id = p.invoice_id
         AND (p2.paid_at, p2.created_at, p2.id) <= (p.paid_at, p.created_at, p.id)
     ) pt ON true
     WHERE i.client_id = $1
     ORDER BY p.paid_at DESC`,
    [clientId]
  );
}
