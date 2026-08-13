import Decimal from "decimal.js";
import { query, queryOne, withTransaction } from "../db";
import { logAudit } from "../audit";
import type { InvoiceItemRow, InvoiceRow, PaymentRow } from "../types";

export type DocType = "QUOTATION" | "PROFORMA" | "INVOICE" | "TAX_INVOICE";

// Non-binding documents (no payments) and what each one converts into.
const CONVERSION_TARGET: Partial<Record<DocType, DocType>> = {
  QUOTATION: "INVOICE",
  PROFORMA: "TAX_INVOICE",
};

// Binding documents that can actually receive payments.
const PAYABLE_TYPES: DocType[] = ["INVOICE", "TAX_INVOICE"];

const DOCUMENT_PREFIX: Record<DocType, string> = {
  QUOTATION: "QUO",
  PROFORMA: "PRO",
  INVOICE: "INV",
  TAX_INVOICE: "TXI",
};

export interface InvoiceWithItems extends InvoiceRow {
  items: InvoiceItemRow[];
}

export interface InvoiceListItem extends InvoiceRow {
  client_name: string;
}

export interface InvoiceDetail extends InvoiceRow {
  client_name: string;
  client_phone: string;
  client_email: string | null;
  items: InvoiceItemRow[];
  payments: PaymentRow[];
}

interface CreateInvoiceItemInput {
  description: string;
  quantity: string;
  unitPrice: string;
}

interface CreateInvoiceInput {
  docType: DocType;
  clientId: string;
  dueDate: string | null;
  notes: string | null;
  items: CreateInvoiceItemInput[];
  createdById: string;
}

async function nextDocumentNumber(
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: { count: string }[] }> },
  docType: DocType
): Promise<string> {
  const prefix = DOCUMENT_PREFIX[docType];
  const year = new Date().getFullYear();
  const countRes = await client.query(
    `SELECT COUNT(*)::text AS count FROM invoices
     WHERE doc_type = $1 AND EXTRACT(YEAR FROM issue_date) = $2`,
    [docType, year]
  );
  const seq = parseInt(countRes.rows[0]?.count ?? "0", 10) + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Every item total, the subtotal, and the grand total are computed with
 * Decimal.js from the raw decimal-string inputs — never with native JS
 * arithmetic — then stored as strings into the NUMERIC columns.
 */
export async function createInvoiceWithItems(
  input: CreateInvoiceInput
): Promise<InvoiceWithItems> {
  const itemTotals = input.items.map((item) =>
    new Decimal(item.quantity).times(item.unitPrice).toFixed(2)
  );
  const subtotal = itemTotals
    .reduce((acc, t) => acc.plus(t), new Decimal(0))
    .toFixed(2);
  const taxAmount = "0.00";
  const totalAmount = new Decimal(subtotal).plus(taxAmount).toFixed(2);

  return withTransaction(async (client) => {
    const documentNumber = await nextDocumentNumber(client, input.docType);

    const invoiceRes = await client.query<InvoiceRow>(
      `INSERT INTO invoices
         (document_number, doc_type, client_id, due_date, subtotal, tax_amount, total_amount, notes, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        documentNumber,
        input.docType,
        input.clientId,
        input.dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        input.notes,
        input.createdById,
      ]
    );
    const invoice = invoiceRes.rows[0];

    const items: InvoiceItemRow[] = [];
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const itemRes = await client.query<InvoiceItemRow>(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [invoice.id, item.description, item.quantity, item.unitPrice, itemTotals[i]]
      );
      items.push(itemRes.rows[0]);
    }

    return { ...invoice, items };
  });
}

export async function listInvoices(filters: {
  docType?: DocType;
  paymentStatus?: string;
  clientId?: string;
  outstandingOnly?: boolean;
}): Promise<InvoiceListItem[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.docType) {
    params.push(filters.docType);
    conditions.push(`i.doc_type = $${params.length}`);
  }
  if (filters.paymentStatus) {
    params.push(filters.paymentStatus);
    conditions.push(`i.payment_status = $${params.length}`);
  }
  if (filters.clientId) {
    params.push(filters.clientId);
    conditions.push(`i.client_id = $${params.length}`);
  }
  if (filters.outstandingOnly) {
    conditions.push(
      `i.doc_type IN ('INVOICE', 'TAX_INVOICE') AND i.payment_status IN ('PENDING', 'PARTIAL', 'OVERDUE')`
    );
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return query<InvoiceListItem>(
    `SELECT i.*, c.name AS client_name
     FROM invoices i
     JOIN clients c ON c.id = i.client_id
     ${where}
     ORDER BY i.created_at DESC`,
    params
  );
}

export async function countOutstandingInvoices(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM invoices
     WHERE doc_type IN ('INVOICE', 'TAX_INVOICE')
       AND payment_status IN ('PENDING', 'PARTIAL', 'OVERDUE')`
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

export interface OutstandingSummary {
  count: number;
  amount: string;
}

export async function getOutstandingSummary(): Promise<OutstandingSummary> {
  const row = await queryOne<{ count: string; amount: string }>(
    `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_amount - amount_paid), 0) AS amount
     FROM invoices
     WHERE doc_type IN ('INVOICE', 'TAX_INVOICE')
       AND payment_status IN ('PENDING', 'PARTIAL', 'OVERDUE')`
  );
  return {
    count: parseInt(row?.count ?? "0", 10),
    amount: row?.amount ?? "0.00",
  };
}

export async function getInvoiceById(id: string): Promise<InvoiceRow | null> {
  return queryOne<InvoiceRow>(`SELECT * FROM invoices WHERE id = $1`, [id]);
}

export async function getInvoiceDetail(
  id: string
): Promise<InvoiceDetail | null> {
  const invoice = await queryOne<
    InvoiceRow & {
      client_name: string;
      client_phone: string;
      client_email: string | null;
    }
  >(
    `SELECT i.*, c.name AS client_name, c.phone AS client_phone, c.email AS client_email
     FROM invoices i
     JOIN clients c ON c.id = i.client_id
     WHERE i.id = $1`,
    [id]
  );
  if (!invoice) return null;

  const items = await query<InvoiceItemRow>(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
    [id]
  );
  const payments = await query<PaymentRow>(
    `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at ASC`,
    [id]
  );

  return { ...invoice, items, payments };
}

/**
 * QUOTATION -> INVOICE, PROFORMA -> TAX_INVOICE. Any other source type is
 * rejected (NOT_CONVERTIBLE) — only these two "estimate" documents can be
 * turned into a payable one, and only once (converted_from_id is UNIQUE).
 */
export async function convertToPayableDocument(
  sourceId: string,
  createdById: string
): Promise<InvoiceWithItems> {
  return withTransaction(async (client) => {
    const sourceRes = await client.query<InvoiceRow>(
      `SELECT * FROM invoices WHERE id = $1 FOR UPDATE`,
      [sourceId]
    );
    const source = sourceRes.rows[0];
    if (!source) throw new Error("NOT_FOUND");

    const targetType = CONVERSION_TARGET[source.doc_type as DocType];
    if (!targetType) throw new Error("NOT_CONVERTIBLE");

    const existingRes = await client.query(
      `SELECT id FROM invoices WHERE converted_from_id = $1`,
      [sourceId]
    );
    if (existingRes.rows.length > 0) throw new Error("ALREADY_CONVERTED");

    const itemsRes = await client.query<InvoiceItemRow>(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
      [sourceId]
    );

    const documentNumber = await nextDocumentNumber(client, targetType);

    const newInvoiceRes = await client.query<InvoiceRow>(
      `INSERT INTO invoices
         (document_number, doc_type, client_id, due_date, subtotal, tax_amount, total_amount, notes, converted_from_id, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        documentNumber,
        targetType,
        source.client_id,
        source.due_date,
        source.subtotal,
        source.tax_amount,
        source.total_amount,
        source.notes,
        sourceId,
        createdById,
      ]
    );
    const newInvoice = newInvoiceRes.rows[0];

    const newItems: InvoiceItemRow[] = [];
    for (const item of itemsRes.rows) {
      const itemRes = await client.query<InvoiceItemRow>(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [newInvoice.id, item.description, item.quantity, item.unit_price, item.total]
      );
      newItems.push(itemRes.rows[0]);
    }

    return { ...newInvoice, items: newItems };
  });
}

/**
 * Cancels a document by setting payment_status = CANCELLED. Refused if any
 * payment has already been recorded against it (money already moved — that
 * needs a credit note / refund process, not a cancel) or if it's already
 * CANCELLED. Line items and any payments are left untouched, preserving the
 * document as an immutable audit trail.
 */
export async function cancelInvoice(
  id: string,
  cancelledById: string
): Promise<InvoiceRow> {
  return withTransaction(async (client) => {
    const res = await client.query<InvoiceRow>(
      `SELECT * FROM invoices WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const invoice = res.rows[0];
    if (!invoice) throw new Error("NOT_FOUND");
    if (invoice.payment_status === "CANCELLED") {
      throw new Error("ALREADY_CANCELLED");
    }
    if (new Decimal(invoice.amount_paid).greaterThan(0)) {
      throw new Error("HAS_PAYMENTS");
    }

    const updatedRes = await client.query<InvoiceRow>(
      `UPDATE invoices SET payment_status = 'CANCELLED', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await logAudit(
      {
        userId: cancelledById,
        action: "INVOICE_CANCELLED",
        entity: "invoice",
        entityId: id,
        meta: { documentNumber: invoice.document_number, docType: invoice.doc_type },
      },
      client
    );

    return updatedRes.rows[0];
  });
}

export interface RecordPaymentResult {
  payment: PaymentRow;
  invoice: InvoiceRow;
}

/**
 * Runs inside a single transaction: insert the payment row, then update
 * amount_paid and derive payment_status in the SAME SQL statement using
 * NUMERIC arithmetic (amount_paid + $2) — status flips PENDING -> PARTIAL
 * -> PAID automatically, entirely inside Postgres.
 */
export async function recordPayment(
  invoiceId: string,
  input: { amount: string; method: string; reference: string | null; notes: string | null },
  receivedById: string
): Promise<RecordPaymentResult> {
  return withTransaction(async (client) => {
    const invRes = await client.query<InvoiceRow>(
      `SELECT * FROM invoices WHERE id = $1 FOR UPDATE`,
      [invoiceId]
    );
    const invoice = invRes.rows[0];
    if (!invoice) throw new Error("NOT_FOUND");
    if (!PAYABLE_TYPES.includes(invoice.doc_type as DocType)) {
      throw new Error("NOT_PAYABLE");
    }
    if (invoice.payment_status === "PAID" || invoice.payment_status === "CANCELLED") {
      throw new Error("ALREADY_SETTLED");
    }

    const paymentRes = await client.query<PaymentRow>(
      `INSERT INTO payments (invoice_id, amount, method, reference, notes, received_by_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [invoiceId, input.amount, input.method, input.reference, input.notes, receivedById]
    );

    const updatedRes = await client.query<InvoiceRow>(
      `UPDATE invoices
       SET amount_paid = amount_paid + $2,
           payment_status = (CASE
             WHEN (amount_paid + $2) >= total_amount THEN 'PAID'
             WHEN (amount_paid + $2) > 0 THEN 'PARTIAL'
             ELSE 'PENDING'
           END)::payment_status,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [invoiceId, input.amount]
    );

    await logAudit(
      {
        userId: receivedById,
        action: "PAYMENT_RECORDED",
        entity: "invoice",
        entityId: invoiceId,
        amount: input.amount,
        meta: { method: input.method, reference: input.reference },
      },
      client
    );

    return { payment: paymentRes.rows[0], invoice: updatedRes.rows[0] };
  });
}

export interface PaymentWithContext extends PaymentRow {
  document_number: string;
  doc_type: DocType;
  total_amount: string;
  amount_paid: string;
  client_name: string;
  received_by_name: string;
}

export async function getPaymentWithContext(
  invoiceId: string,
  paymentId: string
): Promise<PaymentWithContext | null> {
  return queryOne<PaymentWithContext>(
    `SELECT p.*, i.document_number, i.doc_type, i.total_amount, i.amount_paid,
            c.name AS client_name, u.full_name AS received_by_name
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     JOIN clients c ON c.id = i.client_id
     JOIN users u ON u.id = p.received_by_id
     WHERE p.invoice_id = $1 AND p.id = $2`,
    [invoiceId, paymentId]
  );
}
