import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Single shared connection pool for the whole app (Next.js server runtime).
// We avoid Prisma's generated client because this sandbox cannot reach
// binaries.prisma.sh to download the Prisma engines. Raw SQL via `pg` gives
// us the same guarantees we actually need: PostgreSQL NUMERIC columns
// (returned as strings, never floats) + explicit transactions.

// pg's default DATE parser builds a JS Date from local-timezone components,
// which then serializes to a shifted UTC day in JSON on any positive UTC
// offset (e.g. 2026-08-08 -> "2026-08-07T21:00:00.000Z" at UTC+3). Every
// DATE column in this schema is typed as a plain `string` (see types.ts),
// so keep the raw "YYYY-MM-DD" string instead of letting pg convert it.
types.setTypeParser(types.builtins.DATE, (value) => value);
declare global {
  // eslint-disable-next-line no-var
  var __afyaPgPool: Pool | undefined;
}

export const pool: Pool =
  global.__afyaPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__afyaPgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Runs `fn` inside a single Postgres transaction (BEGIN/COMMIT/ROLLBACK).
 * ALL money-affecting operations (payments, payroll, expenses, invoices)
 * MUST go through this helper — never issue standalone writes for financial data.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
