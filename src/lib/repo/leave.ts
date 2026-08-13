import { query, queryOne, withTransaction } from "../db";
import { logAudit } from "../audit";
import type { LeaveRequestRow } from "../types";

export async function createLeaveRequest(input: {
  staffId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}): Promise<LeaveRequestRow> {
  const row = await queryOne<LeaveRequestRow>(
    `INSERT INTO leave_requests (staff_id, start_date, end_date, days, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.staffId, input.startDate, input.endDate, input.days, input.reason]
  );
  if (!row) throw new Error("Imeshindwa kuomba likizo");
  return row;
}

export async function listLeaveRequests(filters: {
  staffId?: string;
  status?: string;
}): Promise<LeaveRequestRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.staffId) {
    params.push(filters.staffId);
    conditions.push(`staff_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return query<LeaveRequestRow>(
    `SELECT * FROM leave_requests ${where} ORDER BY created_at DESC`,
    params
  );
}

/**
 * Runs inside a single transaction: only PENDING requests can be decided,
 * and approving one atomically deducts `days` from the staff's
 * leave_balance_days in the same transaction.
 */
export async function decideLeaveRequest(
  id: string,
  decision: "APPROVED" | "REJECTED",
  decidedById: string,
  decisionNote: string | null
): Promise<LeaveRequestRow> {
  return withTransaction(async (client) => {
    const reqRes = await client.query<LeaveRequestRow>(
      `SELECT * FROM leave_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const leaveReq = reqRes.rows[0];
    if (!leaveReq) throw new Error("NOT_FOUND");
    if (leaveReq.status !== "PENDING") throw new Error("ALREADY_DECIDED");

    if (decision === "APPROVED") {
      const staffRes = await client.query<{ leave_balance_days: number }>(
        `SELECT leave_balance_days FROM staff WHERE id = $1 FOR UPDATE`,
        [leaveReq.staff_id]
      );
      const balance = staffRes.rows[0]?.leave_balance_days ?? 0;
      if (leaveReq.days > balance) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
    }

    const updatedRes = await client.query<LeaveRequestRow>(
      `UPDATE leave_requests
       SET status = $2, decided_by_id = $3, decided_at = now(), decision_note = $4
       WHERE id = $1
       RETURNING *`,
      [id, decision, decidedById, decisionNote]
    );

    if (decision === "APPROVED") {
      await client.query(
        `UPDATE staff SET leave_balance_days = leave_balance_days - $2, updated_at = now() WHERE id = $1`,
        [leaveReq.staff_id, leaveReq.days]
      );
    }

    await logAudit(
      {
        userId: decidedById,
        action: decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        entity: "leave_request",
        entityId: id,
        meta: { staffId: leaveReq.staff_id, days: leaveReq.days },
      },
      client
    );

    return updatedRes.rows[0];
  });
}
