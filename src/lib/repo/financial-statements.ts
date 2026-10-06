import { query, queryOne } from "../db";
import { getExpenseCategoryBreakdown } from "./expenses";
import { getIncomeCategoryBreakdown } from "./income";

export interface ProfitAndLoss {
  from: string;
  to: string;
  serviceRevenue: string;
  otherIncomeByCategory: { category: string; total: string }[];
  totalOtherIncome: string;
  totalRevenue: string;
  expensesByCategory: { category: string; total: string }[];
  totalExpenses: string;
  netProfit: string;
}

/**
 * A real Profit & Loss statement: revenue split into service revenue
 * (payments received against invoices) and other income by category,
 * expenses by category, and the net profit — all real SUMs over
 * [fromDate, toDate), never estimated.
 */
export async function getProfitAndLoss(
  fromDate: string,
  toDate: string
): Promise<ProfitAndLoss> {
  const [serviceRevenueRow, otherIncomeByCategory, expensesByCategory] =
    await Promise.all([
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total
         FROM payments
         WHERE paid_at >= $1 AND paid_at < $2`,
        [fromDate, toDate]
      ),
      getIncomeCategoryBreakdown(fromDate, toDate),
      getExpenseCategoryBreakdown(fromDate, toDate),
    ]);

  const serviceRevenue = serviceRevenueRow?.total ?? "0";
  const totalOtherIncome = otherIncomeByCategory
    .reduce((sum, c) => sum + Number(c.total), 0)
    .toFixed(2);
  const totalRevenue = (Number(serviceRevenue) + Number(totalOtherIncome)).toFixed(2);
  const totalExpenses = expensesByCategory
    .reduce((sum, c) => sum + Number(c.total), 0)
    .toFixed(2);
  const netProfit = (Number(totalRevenue) - Number(totalExpenses)).toFixed(2);

  return {
    from: fromDate,
    to: toDate,
    serviceRevenue,
    otherIncomeByCategory,
    totalOtherIncome,
    totalRevenue,
    expensesByCategory,
    totalExpenses,
    netProfit,
  };
}

export interface BalanceSheet {
  asOf: string;
  cash: string;
  accountsReceivable: string;
  totalAssets: string;
  accountsPayable: string;
  totalLiabilities: string;
  totalEquity: string;
}

/**
 * A simplified, cash-basis statement of financial position "as of" a date.
 * Cash is the running total of every recorded payment/other-income minus
 * every approved expense up to that date (this system has no separate bank
 * ledger to reconcile against). Accounts Receivable is real outstanding
 * invoice balances; Accounts Payable is real unpaid company bills. There is
 * no fixed-asset or inventory valuation line because the schema does not
 * track purchase cost for stock — showing one would mean guessing a number.
 */
export async function getBalanceSheet(asOfDate: string): Promise<BalanceSheet> {
  const row = await queryOne<{
    cash: string;
    accounts_receivable: string;
    accounts_payable: string;
  }>(
    `SELECT
       (
         (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE paid_at < $1::date + 1)
         + (SELECT COALESCE(SUM(amount), 0) FROM other_income WHERE date < $1::date + 1)
         - (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date < $1::date + 1 AND status = 'APPROVED')
       )::text AS cash,
       (
         SELECT COALESCE(SUM(total_amount - amount_paid), 0)
         FROM invoices
         WHERE doc_type IN ('INVOICE', 'TAX_INVOICE')
           AND payment_status IN ('PENDING', 'PARTIAL', 'OVERDUE')
           AND issue_date < $1::date + 1
       )::text AS accounts_receivable,
       (
         SELECT COALESCE(SUM(amount), 0)
         FROM company_bills
         WHERE status IN ('PENDING', 'OVERDUE')
           AND created_at < $1::date + 1
       )::text AS accounts_payable`,
    [asOfDate]
  );

  const cash = row?.cash ?? "0";
  const accountsReceivable = row?.accounts_receivable ?? "0";
  const accountsPayable = row?.accounts_payable ?? "0";
  const totalAssets = (Number(cash) + Number(accountsReceivable)).toFixed(2);
  const totalLiabilities = Number(accountsPayable).toFixed(2);
  const totalEquity = (Number(totalAssets) - Number(totalLiabilities)).toFixed(2);

  return {
    asOf: asOfDate,
    cash: Number(cash).toFixed(2),
    accountsReceivable: Number(accountsReceivable).toFixed(2),
    totalAssets,
    accountsPayable: Number(accountsPayable).toFixed(2),
    totalLiabilities,
    totalEquity,
  };
}
