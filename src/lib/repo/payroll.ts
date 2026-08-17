import { query, withTransaction } from "../db";
import { calculatePayroll } from "../payroll/calculate";
import { logAudit } from "../audit";
import type { PayrollRow } from "../types";

export async function createPayrollForStaff(input: {
  staffId: string;
  month: number;
  year: number;
  otherDeductions: string;
  applyNssf?: boolean;
  createdById: string;
}): Promise<PayrollRow> {
  return withTransaction(async (client) => {
    const staffRes = await client.query(
      `SELECT * FROM staff WHERE id = $1 FOR UPDATE`,
      [input.staffId]
    );
    const staff = staffRes.rows[0];
    if (!staff) throw new Error("NOT_FOUND");

    const existingRes = await client.query(
      `SELECT id FROM payrolls WHERE staff_id = $1 AND month = $2 AND year = $3`,
      [input.staffId, input.month, input.year]
    );
    if (existingRes.rows.length > 0) throw new Error("ALREADY_EXISTS");

    const calc = calculatePayroll({
      baseSalary: staff.base_salary,
      allowances: staff.allowances,
      otherDeductions: input.otherDeductions,
      applyNssf: input.applyNssf,
    });

    const payrollRes = await client.query<PayrollRow>(
      `INSERT INTO payrolls
         (staff_id, month, year, base_salary, allowances, nssf_deduction, paye_deduction, other_deductions, gross_pay, net_pay, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING')
       RETURNING *`,
      [
        input.staffId,
        input.month,
        input.year,
        staff.base_salary,
        staff.allowances,
        calc.nssfDeduction,
        calc.payeDeduction,
        calc.otherDeductions,
        calc.grossPay,
        calc.netPay,
      ]
    );

    await logAudit(
      {
        userId: input.createdById,
        action: "PAYROLL_GENERATED",
        entity: "payroll",
        entityId: payrollRes.rows[0].id,
        amount: calc.netPay,
        meta: { staffId: input.staffId, month: input.month, year: input.year },
      },
      client
    );

    return payrollRes.rows[0];
  });
}

/**
 * Marks a payroll as PAID and, in the same transaction, records the payout
 * as a company expense (category MISHAHARA) so it flows into the finance
 * summary automatically. Refused if already paid.
 */
export async function paySalary(
  payrollId: string,
  paidById: string
): Promise<PayrollRow> {
  return withTransaction(async (client) => {
    const res = await client.query(
      `SELECT p.*, u.full_name AS staff_name
       FROM payrolls p
       JOIN staff s ON s.id = p.staff_id
       JOIN users u ON u.id = s.user_id
       WHERE p.id = $1
       FOR UPDATE`,
      [payrollId]
    );
    const payroll = res.rows[0];
    if (!payroll) throw new Error("NOT_FOUND");
    if (payroll.status === "PAID") throw new Error("ALREADY_PAID");

    const updatedRes = await client.query<PayrollRow>(
      `UPDATE payrolls SET status = 'PAID', paid_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [payrollId]
    );

    const monthLabel = `${payroll.month}/${payroll.year}`;
    const expenseRes = await client.query(
      `INSERT INTO expenses (category, amount, date, description, created_by_id)
       VALUES ('MISHAHARA', $1, CURRENT_DATE, $2, $3)
       RETURNING id`,
      [
        payroll.net_pay,
        `Mshahara wa ${payroll.staff_name} — ${monthLabel}`,
        paidById,
      ]
    );

    await logAudit(
      {
        userId: paidById,
        action: "SALARY_PAID",
        entity: "payroll",
        entityId: payrollId,
        amount: payroll.net_pay,
        meta: {
          staffId: payroll.staff_id,
          month: payroll.month,
          year: payroll.year,
          expenseId: expenseRes.rows[0].id,
        },
      },
      client
    );

    return updatedRes.rows[0];
  });
}

export async function listPayrollHistory(
  staffId: string,
  year?: number
): Promise<PayrollRow[]> {
  if (year) {
    return query<PayrollRow>(
      `SELECT * FROM payrolls WHERE staff_id = $1 AND year = $2 ORDER BY month DESC`,
      [staffId, year]
    );
  }
  return query<PayrollRow>(
    `SELECT * FROM payrolls WHERE staff_id = $1 ORDER BY year DESC, month DESC`,
    [staffId]
  );
}

/** Total net payroll for the current calendar month vs. the previous one. */
export async function getMonthlyPayrollComparison(): Promise<{
  currentTotal: string;
  previousTotal: string;
}> {
  const row = await query<{ current_total: string; previous_total: string }>(
    `SELECT
       (SELECT COALESCE(SUM(net_pay), 0)::text FROM payrolls
        WHERE month = EXTRACT(MONTH FROM CURRENT_DATE)::int
          AND year = EXTRACT(YEAR FROM CURRENT_DATE)::int) AS current_total,
       (SELECT COALESCE(SUM(net_pay), 0)::text FROM payrolls
        WHERE month = EXTRACT(MONTH FROM CURRENT_DATE - interval '1 month')::int
          AND year = EXTRACT(YEAR FROM CURRENT_DATE - interval '1 month')::int) AS previous_total`
  );
  return {
    currentTotal: row[0]?.current_total ?? "0",
    previousTotal: row[0]?.previous_total ?? "0",
  };
}
