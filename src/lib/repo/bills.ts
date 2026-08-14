import Decimal from "decimal.js";
import { query, queryOne, withTransaction } from "../db";
import { logAudit } from "../audit";
import type { CompanyBillRow } from "../types";

export async function createBill(input: {
  name: string;
  category: string;
  amount: string;
  dueDate: string;
  notes: string | null;
  createdById: string;
}): Promise<CompanyBillRow> {
  const row = await queryOne<CompanyBillRow>(
    `INSERT INTO company_bills (name, category, amount, due_date, notes, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.name, input.category, input.amount, input.dueDate, input.notes, input.createdById]
  );
  if (!row) throw new Error("Imeshindwa kuongeza bill");
  return row;
}

export async function listBills(): Promise<CompanyBillRow[]> {
  return query<CompanyBillRow>(
    `SELECT * FROM company_bills ORDER BY due_date ASC`
  );
}

export async function getBillById(id: string): Promise<CompanyBillRow | null> {
  return queryOne<CompanyBillRow>(`SELECT * FROM company_bills WHERE id = $1`, [id]);
}

export async function updateBill(
  id: string,
  patch: {
    name?: string;
    category?: string;
    amount?: string;
    dueDate?: string;
    notes?: string | null;
  }
): Promise<CompanyBillRow | null> {
  const columnMap: Record<string, unknown> = {
    name: patch.name,
    category: patch.category,
    amount: patch.amount,
    due_date: patch.dueDate,
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
    return getBillById(id);
  }

  params.push(id);
  return queryOne<CompanyBillRow>(
    `UPDATE company_bills SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

export async function deleteBill(id: string): Promise<void> {
  const bill = await getBillById(id);
  if (!bill) throw new Error("NOT_FOUND");
  if (bill.status === "PAID") throw new Error("ALREADY_PAID");
  await query(`DELETE FROM company_bills WHERE id = $1`, [id]);
}

/**
 * Marks a bill as PAID and, in the same transaction, records it as a
 * company expense so it flows into the finance summary automatically —
 * same pattern as paySalary().
 */
export async function payBill(
  id: string,
  paidById: string
): Promise<CompanyBillRow> {
  return withTransaction(async (client) => {
    const res = await client.query<CompanyBillRow>(
      `SELECT * FROM company_bills WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const bill = res.rows[0];
    if (!bill) throw new Error("NOT_FOUND");
    if (bill.status === "PAID") throw new Error("ALREADY_PAID");

    const updatedRes = await client.query<CompanyBillRow>(
      `UPDATE company_bills SET status = 'PAID', paid_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    const expenseRes = await client.query(
      `INSERT INTO expenses (category, amount, date, description, created_by_id)
       VALUES ('UENDESHAJI', $1, CURRENT_DATE, $2, $3)
       RETURNING id`,
      [bill.amount, `Bill: ${bill.name}`, paidById]
    );

    await logAudit(
      {
        userId: paidById,
        action: "BILL_PAID",
        entity: "company_bill",
        entityId: id,
        amount: new Decimal(bill.amount).toFixed(2),
        meta: { name: bill.name, expenseId: expenseRes.rows[0].id },
      },
      client
    );

    return updatedRes.rows[0];
  });
}
