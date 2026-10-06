import type { PoolClient } from "pg";
import { pool, query } from "./db";

interface AuditLogInput {
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  amount?: string | null;
  meta?: Record<string, unknown> | null;
}

/**
 * Pass the transaction's `client` when called inside `withTransaction` so
 * the audit entry commits/rolls back atomically with the action it records;
 * omit it for reads-only or non-transactional writes.
 */
export async function logAudit(
  input: AuditLogInput,
  client?: Pick<PoolClient, "query">
): Promise<void> {
  const executor = client ?? pool;
  await executor.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, amount, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.userId,
      input.action,
      input.entity,
      input.entityId ?? null,
      input.amount ?? null,
      input.meta ? JSON.stringify(input.meta) : null,
    ]
  );
}

export interface AuditLogWithUser {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  amount: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  user_name: string;
}

export async function listRecentActivity(limit = 10): Promise<AuditLogWithUser[]> {
  return query<AuditLogWithUser>(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.amount, a.meta, a.created_at,
            u.full_name AS user_name
     FROM audit_logs a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit]
  );
}

export interface AuditLogFilters {
  from?: string;
  to?: string;
  userId?: string;
  entity?: string;
  limit?: number;
  offset?: number;
}

function buildAuditLogWhere(filters: AuditLogFilters) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.from) {
    params.push(filters.from);
    conditions.push(`a.created_at >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    conditions.push(`a.created_at < $${params.length}::date + 1`);
  }
  if (filters.userId) {
    params.push(filters.userId);
    conditions.push(`a.user_id = $${params.length}`);
  }
  if (filters.entity) {
    params.push(filters.entity);
    conditions.push(`a.entity = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params };
}

export async function listAuditLogs(
  filters: AuditLogFilters
): Promise<AuditLogWithUser[]> {
  const { where, params } = buildAuditLogWhere(filters);
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  params.push(limit);
  params.push(offset);

  return query<AuditLogWithUser>(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.amount, a.meta, a.created_at,
            u.full_name AS user_name
     FROM audit_logs a
     JOIN users u ON u.id = a.user_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
}

export async function countAuditLogs(filters: AuditLogFilters): Promise<number> {
  const { where, params } = buildAuditLogWhere(filters);
  const row = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM audit_logs a ${where}`,
    params
  );
  return parseInt(row.rows[0]?.count ?? "0", 10);
}

export interface AuditLogActor {
  id: string;
  full_name: string;
}

/** Distinct users who have at least one audit log entry — for a filter dropdown. */
export async function listAuditLogActors(): Promise<AuditLogActor[]> {
  return query<AuditLogActor>(
    `SELECT DISTINCT u.id, u.full_name
     FROM audit_logs a
     JOIN users u ON u.id = a.user_id
     ORDER BY u.full_name ASC`
  );
}

/** Distinct entity types recorded — for a filter dropdown. */
export async function listAuditLogEntities(): Promise<string[]> {
  const rows = await query<{ entity: string }>(
    `SELECT DISTINCT entity FROM audit_logs ORDER BY entity ASC`
  );
  return rows.map((r) => r.entity);
}
