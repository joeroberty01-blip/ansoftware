import { query, queryOne } from "../db";

/**
 * The title shown under a person's name at the top of every page (e.g.
 * "C.E.O", "Director", "Coordinator"). Display only: it changes no access.
 * Without one, the label comes from the account's role.
 */
const key = (userId: string) => `account_title:${userId}`;

export async function getAccountTitle(userId: string): Promise<string | null> {
  const row = await queryOne<{ value: string | null }>(
    `SELECT value FROM app_settings WHERE key = $1`,
    [key(userId)]
  );
  return row?.value?.trim() || null;
}

export async function setAccountTitle(userId: string, title: string): Promise<void> {
  await query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
    [key(userId), title.trim()]
  );
}
