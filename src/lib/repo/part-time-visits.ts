import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { query, withTransaction } from "../db";
import { logAudit } from "../audit";
import type { PartTimePayInput, PartTimeVisitInput } from "../validation/part-time-visits";

export class PartTimeVisitError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface PartTimeVisit {
  id: string;
  /** VISIT_REPORT rows come from a home visit marked Part-time: read-only here. */
  origin: "REGISTER" | "VISIT_REPORT";
  home_visit_id: string | null;
  staff_id: string | null;
  external_name: string | null;
  external_phone: string | null;
  staff_name: string;
  patient_id: string;
  patient_name: string;
  visit_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  reason_note: string | null;
  covered_staff_id: string | null;
  covered_staff_name: string | null;
  notes: string | null;
  /** Pay fields are null for everyone but an Admin. */
  pay_amount: string | null;
  pay_reason: string | null;
  pay_set_by_name: string | null;
  paid_at: string | null;
  paid_by_name: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  voided_at: string | null;
  void_reason: string | null;
  voided_by_name: string | null;
  created_by_name: string;
  created_at: string;
}

/**
 * Every part-time visit between two dates (inclusive). A home visit report
 * marked Part-time is listed too, unless the same person, patient and day is
 * already in the register. Pay is left out unless `withPay`.
 */
export async function listPartTimeVisits(
  from: string,
  to: string,
  withPay: boolean
): Promise<PartTimeVisit[]> {
  const rows = await query<PartTimeVisit>(
    `SELECT * FROM (
       SELECT p.id, 'REGISTER' AS origin, NULL::text AS home_visit_id,
              p.staff_id, p.external_name, p.external_phone,
              COALESCE(su.full_name, p.external_name) AS staff_name,
              p.patient_id, pt.full_name AS patient_name, p.visit_date,
              to_char(p.start_time, 'HH24:MI') AS start_time,
              to_char(p.end_time, 'HH24:MI') AS end_time,
              p.reason, p.reason_note, p.covered_staff_id, cu.full_name AS covered_staff_name,
              p.notes, p.pay_amount, p.pay_reason, psu.full_name AS pay_set_by_name,
              p.paid_at, pbu.full_name AS paid_by_name, p.payment_method, p.payment_reference,
              p.voided_at, p.void_reason, vu.full_name AS voided_by_name,
              u.full_name AS created_by_name, p.created_at
       FROM part_time_visits p
       JOIN patients pt ON pt.id = p.patient_id
       JOIN users u ON u.id = p.created_by_id
       LEFT JOIN staff s ON s.id = p.staff_id
       LEFT JOIN users su ON su.id = s.user_id
       LEFT JOIN staff cs ON cs.id = p.covered_staff_id
       LEFT JOIN users cu ON cu.id = cs.user_id
       LEFT JOIN users vu ON vu.id = p.voided_by_id
       LEFT JOIN users psu ON psu.id = p.pay_set_by_id
       LEFT JOIN users pbu ON pbu.id = p.paid_by_id
       WHERE p.visit_date BETWEEN $1 AND $2
       UNION ALL
       SELECT 'hv-' || h.id, 'VISIT_REPORT', h.id,
              h.staff_id, NULL, NULL,
              COALESCE(su.full_name, 'Not recorded'),
              h.patient_id, pt.full_name, h.visit_date,
              NULL, NULL, NULL, NULL, NULL, NULL,
              NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
              NULL, NULL, NULL,
              u.full_name, h.created_at
       FROM home_visits h
       JOIN patients pt ON pt.id = h.patient_id
       JOIN users u ON u.id = h.created_by_id
       LEFT JOIN staff s ON s.id = h.staff_id
       LEFT JOIN users su ON su.id = s.user_id
       WHERE h.visit_type = 'PART_TIME' AND h.status = 'COMPLETED'
         AND h.visit_date BETWEEN $1 AND $2
         AND NOT EXISTS (
           SELECT 1 FROM part_time_visits x
           WHERE x.patient_id = h.patient_id AND x.visit_date = h.visit_date
             AND x.staff_id = h.staff_id AND x.voided_at IS NULL
         )
     ) v
     ORDER BY v.visit_date DESC, v.start_time DESC NULLS LAST, v.created_at DESC`,
    [from, to]
  );
  if (withPay) return rows;
  return rows.map((r) => ({
    ...r,
    pay_amount: null,
    pay_reason: null,
    pay_set_by_name: null,
    paid_at: null,
    paid_by_name: null,
    payment_method: null,
    payment_reference: null,
  }));
}

export interface PartTimeOptions {
  staff: { id: string; full_name: string; active: boolean }[];
  patients: { id: string; full_name: string; assigned_staff_id: string | null }[];
}

/**
 * Choices for the form. Former staff are included (marked inactive) so a past
 * visit can still be recorded or edited. Names only, no phone numbers.
 */
export async function listPartTimeOptions(): Promise<PartTimeOptions> {
  const [staff, patients] = await Promise.all([
    query<PartTimeOptions["staff"][number]>(
      `SELECT s.id, u.full_name,
              (s.employment_status = 'ACTIVE' AND u.status = 'APPROVED') AS active
       FROM staff s JOIN users u ON u.id = s.user_id
       WHERE u.status IN ('APPROVED', 'SUSPENDED')
       ORDER BY active DESC, u.full_name`
    ),
    query<PartTimeOptions["patients"][number]>(
      `SELECT id, full_name, assigned_staff_id FROM patients ORDER BY full_name`
    ),
  ]);
  return { staff, patients };
}

/** Turns bad ids, future dates and repeats into clear messages before writing. */
async function assertValid(client: PoolClient, d: PartTimeVisitInput, ignoreId: string | null) {
  const { rows } = await client.query<{
    today: string;
    patient_ok: boolean;
    staff_ok: boolean;
    covered_ok: boolean;
    duplicate: boolean;
  }>(
    `SELECT (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date::text AS today,
            EXISTS (SELECT 1 FROM patients WHERE id = $1) AS patient_ok,
            ($2::text IS NULL OR EXISTS (SELECT 1 FROM staff WHERE id = $2)) AS staff_ok,
            ($3::text IS NULL OR EXISTS (SELECT 1 FROM staff WHERE id = $3)) AS covered_ok,
            EXISTS (
              SELECT 1 FROM part_time_visits
              WHERE voided_at IS NULL AND patient_id = $1 AND visit_date = $4::date
                AND staff_id IS NOT DISTINCT FROM $2::text
                AND lower(external_name) IS NOT DISTINCT FROM lower($5::text)
                AND start_time IS NOT DISTINCT FROM $6::time
                AND ($7::text IS NULL OR id <> $7)
            ) AS duplicate`,
    [d.patientId, d.staffId, d.coveredStaffId, d.visitDate, d.externalName, d.startTime, ignoreId]
  );
  const r = rows[0];
  if (d.visitDate > r.today) {
    throw new PartTimeVisitError("The visit date can't be in the future.", 400);
  }
  if (!r.patient_ok) throw new PartTimeVisitError("Patient not found.", 404);
  if (!r.staff_ok || !r.covered_ok) throw new PartTimeVisitError("Staff member not found.", 404);
  if (r.duplicate) {
    throw new PartTimeVisitError(
      "This visit is already recorded (same person, patient, date and start time).",
      409
    );
  }
}

const values = (d: PartTimeVisitInput) => [
  d.staffId,
  d.externalName,
  d.externalName ? d.externalPhone : null,
  d.patientId,
  d.visitDate,
  d.startTime,
  d.endTime,
  d.reason,
  d.reasonNote,
  d.coveredStaffId,
  d.notes,
];

export async function createPartTimeVisit(d: PartTimeVisitInput, userId: string): Promise<string> {
  return withTransaction(async (client) => {
    await assertValid(client, d, null);
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO part_time_visits
         (staff_id, external_name, external_phone, patient_id, visit_date, start_time,
          end_time, reason, reason_note, covered_staff_id, notes, created_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [...values(d), userId]
    );
    await logAudit(
      {
        userId,
        action: "PART_TIME_VISIT_CREATED",
        entity: "part_time_visit",
        entityId: rows[0].id,
        meta: { patientId: d.patientId, staffId: d.staffId, reason: d.reason },
      },
      client
    );
    return rows[0].id;
  });
}

async function lockActive(client: PoolClient, id: string): Promise<Record<string, unknown>> {
  const { rows } = await client.query(`SELECT * FROM part_time_visits WHERE id = $1 FOR UPDATE`, [
    id,
  ]);
  if (!rows[0]) throw new PartTimeVisitError("Part-time visit not found.", 404);
  if (rows[0].voided_at) throw new PartTimeVisitError("This record is already cancelled.", 409);
  return rows[0];
}

function assertNotPaid(row: Record<string, unknown>) {
  if (row.paid_at) {
    throw new PartTimeVisitError("This visit is already paid. Undo the payment first.", 409);
  }
}

/** The audit entry keeps the values as they were before the edit. */
export async function updatePartTimeVisit(id: string, d: PartTimeVisitInput, userId: string) {
  return withTransaction(async (client) => {
    const before = await lockActive(client, id);
    assertNotPaid(before);
    await assertValid(client, d, id);
    await client.query(
      `UPDATE part_time_visits
       SET staff_id = $1, external_name = $2, external_phone = $3, patient_id = $4,
           visit_date = $5, start_time = $6, end_time = $7, reason = $8, reason_note = $9,
           covered_staff_id = $10, notes = $11, updated_at = now()
       WHERE id = $12`,
      [...values(d), id]
    );
    await logAudit(
      {
        userId,
        action: "PART_TIME_VISIT_UPDATED",
        entity: "part_time_visit",
        entityId: id,
        meta: { before },
      },
      client
    );
  });
}

/** Expenses made by paying a visit carry the visit's id in their own id. */
const expenseIdPrefix = (visitId: string) => `ptv-${visitId}-`;

/**
 * Admin only (checked by the route). Marking a visit as paid records an
 * approved expense in the same transaction; undoing the payment rejects that
 * expense, so it stays on file but no longer counts.
 */
export async function updatePartTimePay(id: string, d: PartTimePayInput, userId: string) {
  return withTransaction(async (client) => {
    const row = await lockActive(client, id);
    const audit = (action: string, amount: string | null, meta: Record<string, unknown>) =>
      logAudit(
        { userId, action, entity: "part_time_visit", entityId: id, amount, meta },
        client
      );

    if (d.action === "SET_AMOUNT") {
      assertNotPaid(row);
      await client.query(
        `UPDATE part_time_visits
         SET pay_amount = $2, pay_reason = $3, pay_set_by_id = $4, updated_at = now()
         WHERE id = $1`,
        [id, d.amount, d.reason, userId]
      );
      await audit("PART_TIME_PAY_SET", d.amount, {
        reason: d.reason,
        previousAmount: row.pay_amount,
        previousReason: row.pay_reason,
      });
    } else if (d.action === "MARK_PAID") {
      assertNotPaid(row);
      if (!row.pay_amount) throw new PartTimeVisitError("Set the amount first.", 400);
      await client.query(
        `UPDATE part_time_visits
         SET paid_at = now(), paid_by_id = $2, payment_method = $3, payment_reference = $4,
             updated_at = now()
         WHERE id = $1`,
        [id, userId, d.method, d.reference]
      );
      const expense = await client.query<{ id: string }>(
        `INSERT INTO expenses (id, category, amount, date, description, payment_method,
                               created_by_id, status)
         SELECT $2, 'MISHAHARA', p.pay_amount,
                (now() AT TIME ZONE 'Africa/Dar_es_Salaam')::date,
                'Part-time visit: ' || COALESCE(u.full_name, p.external_name)
                  || ', ' || to_char(p.visit_date, 'DD/MM/YYYY'),
                $3::payment_method, $4, 'APPROVED'
         FROM part_time_visits p
         LEFT JOIN staff s ON s.id = p.staff_id
         LEFT JOIN users u ON u.id = s.user_id
         WHERE p.id = $1
         RETURNING id`,
        [id, expenseIdPrefix(id) + randomUUID(), d.method, userId]
      );
      await audit("PART_TIME_PAID", String(row.pay_amount), {
        method: d.method,
        reference: d.reference,
        expenseId: expense.rows[0].id,
      });
    } else {
      if (!row.paid_at) throw new PartTimeVisitError("This visit is not marked as paid.", 409);
      await client.query(
        `UPDATE part_time_visits
         SET paid_at = NULL, paid_by_id = NULL, payment_method = NULL, payment_reference = NULL,
             updated_at = now()
         WHERE id = $1`,
        [id]
      );
      const expenses = await client.query<{ id: string }>(
        `UPDATE expenses
         SET status = 'REJECTED', description = description || ' (payment undone, not counted)'
         WHERE starts_with(id, $1) AND status = 'APPROVED'
         RETURNING id`,
        [expenseIdPrefix(id)]
      );
      await audit("PART_TIME_PAYMENT_UNDONE", String(row.pay_amount), {
        reason: d.reason,
        rejectedExpenseIds: expenses.rows.map((e) => e.id),
        paidAt: row.paid_at,
        paidById: row.paid_by_id,
        method: row.payment_method,
        reference: row.payment_reference,
      });
    }
  });
}

/** Cancels a wrong record. The row stays on file with who cancelled it and why. */
export async function voidPartTimeVisit(id: string, reason: string, userId: string) {
  return withTransaction(async (client) => {
    assertNotPaid(await lockActive(client, id));
    await client.query(
      `UPDATE part_time_visits
       SET voided_at = now(), voided_by_id = $2, void_reason = $3, updated_at = now()
       WHERE id = $1`,
      [id, userId, reason]
    );
    await logAudit(
      {
        userId,
        action: "PART_TIME_VISIT_CANCELLED",
        entity: "part_time_visit",
        entityId: id,
        meta: { reason },
      },
      client
    );
  });
}
