import { query, withTransaction } from "../db";
import { calculatePayroll } from "../payroll/calculate";
import { logAudit } from "../audit";
import type { PayrollRow } from "../types";

export async function createPayrollForStaff(input: {
  staffId: string;
  month: number;
  year: number;
  otherDeductions: string;
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
