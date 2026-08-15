import { query, queryOne } from "../db";
import { logAudit } from "../audit";
import type { ExpenseRow } from "../types";

export async function createExpense(input: {
  category: string;
  amount: string;
  date: string;
  description: string;
  paymentMethod?: string | null;
  createdById: string;
}): Promise<ExpenseRow> {
  const row = await queryOne<ExpenseRow>(
    `INSERT INTO expenses (category, amount, date, description, payment_method, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.category,
      input.amount,
      input.date,
      input.description,
      input.paymentMethod ?? null,
      input.createdById,
    ]
  );
  if (!row) throw new Error("Imeshindwa kuongeza expense");

  await logAudit({
    userId: input.createdById,
    action: "EXPENSE_CREATED",
    entity: "expense",
    entityId: row.id,
    amount: input.amount,
    meta: { category: input.category },
  });

  return row;
}

export async function listRecentExpenses(limit = 20): Promise<ExpenseRow[]> {
  return query<ExpenseRow>(
    `SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT $1`,
    [limit]
  );
}

export async function listAllExpenses(): Promise<ExpenseRow[]> {
  return query<ExpenseRow>(
    `SELECT * FROM expenses ORDER BY date DESC, created_at DESC`
  );
}

export async function getExpenseById(id: string): Promise<ExpenseRow | null> {
  return queryOne<ExpenseRow>(`SELECT * FROM expenses WHERE id = $1`, [id]);
}

export async function setExpenseAttachment(
  id: string,
  attachmentUrl: string
): Promise<ExpenseRow | null> {
  return queryOne<ExpenseRow>(
    `UPDATE expenses SET attachment_url = $2 WHERE id = $1 RETURNING *`,
    [id, attachmentUrl]
  );
}

export interface ExpenseCategoryBreakdownRow {
  category: string;
  total: string;
}

/** Expense totals grouped by category within [fromDate, toDate). */
export async function getExpenseCategoryBreakdown(
  fromDate: string,
  toDate: string
): Promise<ExpenseCategoryBreakdownRow[]> {
  return query<ExpenseCategoryBreakdownRow>(
    `SELECT category, COALESCE(SUM(amount), 0)::text AS total
     FROM expenses
     WHERE date >= $1 AND date < $2
     GROUP BY category
     HAVING SUM(amount) > 0
     ORDER BY SUM(amount) DESC`,
    [fromDate, toDate]
  );
}
