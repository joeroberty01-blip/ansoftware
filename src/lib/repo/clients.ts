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
    `SELECT p.id, p.amount, p.method, p.reference, p.paid_at,
            i.id AS invoice_id, i.document_number
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     WHERE i.client_id = $1
     ORDER BY p.paid_at DESC`,
    [clientId]
  );
}
