import { query, queryOne } from "../db";
import { logAudit } from "../audit";
import type { ExpenseRow } from "../types";

export async function createExpense(input: {
  category: string;
  amount: string;
  date: string;
  description: string;
  createdById: string;
}): Promise<ExpenseRow> {
  const row = await queryOne<ExpenseRow>(
    `INSERT INTO expenses (category, amount, date, description, created_by_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.category, input.amount, input.date, input.description, input.createdById]
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
