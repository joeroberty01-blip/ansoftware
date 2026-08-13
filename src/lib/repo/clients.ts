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
