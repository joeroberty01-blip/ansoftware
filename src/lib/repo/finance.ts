import { query, queryOne } from "../db";

export type FinancePeriod = "today" | "week" | "month";

export interface FinanceSummary {
  period: FinancePeriod;
  from: string;
  to: string;
  income: string;
  expenses: string;
  netProfit: string;
  outstandingInvoices: number;
}

/**
 * All summing/subtracting happens in Postgres over NUMERIC columns
 * (SUM, and a NUMERIC - NUMERIC subtraction for net profit) — no
 * money value is ever read into JS and added/subtracted there.
 */
export async function getFinanceSummary(
  period: FinancePeriod
): Promise<FinanceSummary> {
  const row = await queryOne<{
    from_date: string;
    to_date: string;
    income: string;
    expenses: string;
    net_profit: string;
    outstanding_invoices: string;
  }>(
    `WITH period AS (
       SELECT
         CASE
           WHEN $1 = 'today' THEN CURRENT_DATE
           WHEN $1 = 'week' THEN date_trunc('week', CURRENT_DATE)::date
           ELSE date_trunc('month', CURRENT_DATE)::date
         END AS from_date,
         CASE
           WHEN $1 = 'today' THEN (CURRENT_DATE + 1)
           WHEN $1 = 'week' THEN (date_trunc('week', CURRENT_DATE) + interval '1 week')::date
           ELSE (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
         END AS to_date
     ),
     income AS (
       SELECT COALESCE(SUM(p.amount), 0) AS total
       FROM payments p, period
       WHERE p.paid_at >= period.from_date AND p.paid_at < period.to_date
     ),
     expense AS (
       SELECT COALESCE(SUM(e.amount), 0) AS total
       FROM expenses e, period
       WHERE e.date >= period.from_date AND e.date < period.to_date
     ),
     outstanding AS (
       SELECT COUNT(*) AS count
       FROM invoices
       WHERE payment_status IN ('PENDING', 'PARTIAL', 'OVERDUE')
         AND doc_type IN ('INVOICE', 'TAX_INVOICE')
     )
     SELECT
       period.from_date::text AS from_date,
       period.to_date::text AS to_date,
       income.total AS income,
       expense.total AS expenses,
       (income.total - expense.total) AS net_profit,
       outstanding.count AS outstanding_invoices
     FROM period, income, expense, outstanding`,
    [period]
  );

  if (!row) throw new Error("Imeshindwa kupata muhtasari wa fedha");

  return {
    period,
    from: row.from_date,
    to: row.to_date,
    income: row.income,
    expenses: row.expenses,
    netProfit: row.net_profit,
    outstandingInvoices: parseInt(row.outstanding_invoices, 10),
  };
}

/**
 * Same current-period totals as getFinanceSummary, plus the immediately
 * preceding period of equal length, so the UI can show a real % change
 * instead of a fabricated trend arrow.
 */
export async function getFinanceComparison(period: FinancePeriod): Promise<{
  income: string;
  previousIncome: string;
  expenses: string;
  previousExpenses: string;
}> {
  const row = await queryOne<{
    income: string;
    previous_income: string;
    expenses: string;
    previous_expenses: string;
  }>(
    `WITH period AS (
       SELECT
         CASE
           WHEN $1 = 'today' THEN CURRENT_DATE
           WHEN $1 = 'week' THEN date_trunc('week', CURRENT_DATE)::date
           ELSE date_trunc('month', CURRENT_DATE)::date
         END AS from_date,
         CASE
           WHEN $1 = 'today' THEN (CURRENT_DATE + 1)
           WHEN $1 = 'week' THEN (date_trunc('week', CURRENT_DATE) + interval '1 week')::date
           ELSE (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
         END AS to_date,
         CASE
           WHEN $1 = 'today' THEN (CURRENT_DATE - 1)
           WHEN $1 = 'week' THEN (date_trunc('week', CURRENT_DATE) - interval '1 week')::date
           ELSE (date_trunc('month', CURRENT_DATE) - interval '1 month')::date
         END AS prev_from_date
     )
     SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM payments, period WHERE paid_at >= period.from_date AND paid_at < period.to_date) AS income,
       (SELECT COALESCE(SUM(amount), 0) FROM payments, period WHERE paid_at >= period.prev_from_date AND paid_at < period.from_date) AS previous_income,
       (SELECT COALESCE(SUM(amount), 0) FROM expenses, period WHERE date >= period.from_date AND date < period.to_date) AS expenses,
       (SELECT COALESCE(SUM(amount), 0) FROM expenses, period WHERE date >= period.prev_from_date AND date < period.from_date) AS previous_expenses`,
    [period]
  );

  return {
    income: row?.income ?? "0",
    previousIncome: row?.previous_income ?? "0",
    expenses: row?.expenses ?? "0",
    previousExpenses: row?.previous_expenses ?? "0",
  };
}

export interface MonthlyRevenuePoint {
  month: string;
  income: string;
}

/** Last `months` calendar months of income (SUM of payments), oldest first. */
export async function getRevenueTrend(
  months: number
): Promise<MonthlyRevenuePoint[]> {
  return query<MonthlyRevenuePoint>(
    `WITH month_series AS (
       SELECT date_trunc('month', CURRENT_DATE) - (n || ' months')::interval AS month_start
       FROM generate_series(0, $1 - 1) AS n
     )
     SELECT
       to_char(ms.month_start, 'YYYY-MM') AS month,
       COALESCE(SUM(p.amount), 0) AS income
     FROM month_series ms
     LEFT JOIN payments p
       ON p.paid_at >= ms.month_start
       AND p.paid_at < ms.month_start + interval '1 month'
     GROUP BY ms.month_start
     ORDER BY ms.month_start ASC`,
    [months]
  );
}

export interface MonthlyExpensePoint {
  month: string;
  expenses: string;
}

/** Last `months` calendar months of expenses (SUM of expenses.amount), oldest first. */
export async function getExpenseTrend(
  months: number
): Promise<MonthlyExpensePoint[]> {
  return query<MonthlyExpensePoint>(
    `WITH month_series AS (
       SELECT date_trunc('month', CURRENT_DATE) - (n || ' months')::interval AS month_start
       FROM generate_series(0, $1 - 1) AS n
     )
     SELECT
       to_char(ms.month_start, 'YYYY-MM') AS month,
       COALESCE(SUM(e.amount), 0) AS expenses
     FROM month_series ms
     LEFT JOIN expenses e
       ON e.date >= ms.month_start
       AND e.date < ms.month_start + interval '1 month'
     GROUP BY ms.month_start
     ORDER BY ms.month_start ASC`,
    [months]
  );
}
