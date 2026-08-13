import type { PoolClient } from "pg";
import { pool } from "./db";

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
