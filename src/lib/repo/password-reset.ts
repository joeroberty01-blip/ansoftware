import type { PoolClient } from "pg";
import { query, queryOne } from "../db";

export const RESET_CODE_TTL_MINUTES = 15;
export const RESET_CODE_MAX_ATTEMPTS = 5;

/** Codes created for this user in the last hour, and seconds since the newest. */
export async function recentResetCodeStats(
  userId: string
): Promise<{ lastHour: number; secondsSinceLast: number | null }> {
  const row = await queryOne<{ last_hour: string; since_last: string | null }>(
    `SELECT COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour')::text AS last_hour,
            EXTRACT(EPOCH FROM now() - MAX(created_at))::text AS since_last
     FROM password_reset_codes WHERE user_id = $1`,
    [userId]
  );
  return {
    lastHour: Number(row?.last_hour ?? 0),
    secondsSinceLast: row?.since_last == null ? null : Number(row.since_last),
  };
}

/** Retires older unused codes and stores the new one. Returns its id. */
export async function createResetCode(input: {
  userId: string;
  codeHash: string;
  requestIp: string | null;
}): Promise<string> {
  await query(
    `UPDATE password_reset_codes SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL`,
    [input.userId]
  );
  const row = await queryOne<{ id: string }>(
    `INSERT INTO password_reset_codes (user_id, code_hash, expires_at, request_ip)
     VALUES ($1, $2, now() + make_interval(mins => $3), $4)
     RETURNING id`,
    [input.userId, input.codeHash, RESET_CODE_TTL_MINUTES, input.requestIp]
  );
  return row!.id;
}

export async function deleteResetCode(id: string): Promise<void> {
  await query(`DELETE FROM password_reset_codes WHERE id = $1`, [id]);
}

/**
 * Counts one attempt against the user's live code and returns it, or null
 * when there is no unused, unexpired code with attempts left.
 */
export async function takeResetAttempt(
  userId: string
): Promise<{ id: string; code_hash: string; attempts: number } | null> {
  return queryOne(
    `UPDATE password_reset_codes SET attempts = attempts + 1
     WHERE id = (
       SELECT id FROM password_reset_codes
       WHERE user_id = $1 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1
     ) AND attempts < $2
     RETURNING id, code_hash, attempts`,
    [userId, RESET_CODE_MAX_ATTEMPTS]
  );
}

/** Marks the code used; false if another request used it first. */
export async function consumeResetCode(
  client: Pick<PoolClient, "query">,
  id: string,
  userId: string
): Promise<boolean> {
  const res = await client.query(
    `UPDATE password_reset_codes SET used_at = now()
     WHERE id = $1 AND used_at IS NULL RETURNING id`,
    [id]
  );
  if (res.rowCount !== 1) return false;
  await client.query(
    `UPDATE password_reset_codes SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );
  return true;
}
