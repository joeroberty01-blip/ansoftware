import { query, queryOne } from "../db";
import { logAudit } from "../audit";
import type { OtherIncomeRow } from "../types";

export async function createIncome(input: {
  category: string;
  amount: string;
  date: string;
  source: string;
  description: string;
  paymentMethod?: string | null;
  createdById: string;
}): Promise<OtherIncomeRow> {
  const row = await queryOne<OtherIncomeRow>(
    `INSERT INTO other_income (category, amount, date, source, description, payment_method, created_by_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.category,
      input.amount,
      input.date,
      input.source,
      input.description,
      input.paymentMethod ?? null,
      input.createdById,
    ]
  );
  if (!row) throw new Error("Imeshindwa kuongeza mapato");

  await logAudit({
    userId: input.createdById,
    action: "INCOME_CREATED",
    entity: "other_income",
    entityId: row.id,
    amount: input.amount,
    meta: { category: input.category },
  });

  return row;
}

export async function listRecentIncome(limit = 20): Promise<OtherIncomeRow[]> {
  return query<OtherIncomeRow>(
    `SELECT * FROM other_income ORDER BY date DESC, created_at DESC LIMIT $1`,
    [limit]
  );
}

export async function listAllIncome(): Promise<OtherIncomeRow[]> {
  return query<OtherIncomeRow>(
    `SELECT * FROM other_income ORDER BY date DESC, created_at DESC`
  );
}

export interface IncomeCategoryBreakdownRow {
  category: string;
  total: string;
}

/** Other-income totals grouped by category within [fromDate, toDate). */
export async function getIncomeCategoryBreakdown(
  fromDate: string,
  toDate: string
): Promise<IncomeCategoryBreakdownRow[]> {
  return query<IncomeCategoryBreakdownRow>(
    `SELECT category, COALESCE(SUM(amount), 0)::text AS total
     FROM other_income
     WHERE date >= $1 AND date < $2
     GROUP BY category
     HAVING SUM(amount) > 0
     ORDER BY SUM(amount) DESC`,
    [fromDate, toDate]
  );
}
