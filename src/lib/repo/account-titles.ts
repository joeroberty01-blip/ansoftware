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

export interface AccountTitleRow {
  user_id: string;
  full_name: string;
  role: "ADMIN" | "STAFF";
  staff_number: string | null;
  profession: string | null;
  is_chief_co: boolean;
  title: string | null;
}

/** Every approved sign-in account (Admins too), with the title it shows. */
export async function listAccountTitles(): Promise<AccountTitleRow[]> {
  return query<AccountTitleRow>(
    `SELECT u.id AS user_id, u.full_name, u.role,
            s.staff_number, s.profession, COALESCE(s.is_chief_co, false) AS is_chief_co,
            NULLIF(btrim(a.value), '') AS title
       FROM users u
       LEFT JOIN staff s ON s.user_id = u.id
       LEFT JOIN app_settings a ON a.key = 'account_title:' || u.id
      WHERE u.status = 'APPROVED'
      ORDER BY (u.role = 'ADMIN') DESC, u.full_name ASC`
  );
}
