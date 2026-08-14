import { query, queryOne } from "../db";
import type { UserRow } from "../types";

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>(`SELECT * FROM users WHERE email = $1`, [
    email.toLowerCase().trim(),
  ]);
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [id]);
}

export async function countAdmins(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM users WHERE role = 'ADMIN'`
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: "ADMIN" | "STAFF";
  status: "PENDING" | "APPROVED";
}): Promise<UserRow> {
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email, password_hash, full_name, phone, role, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.email.toLowerCase().trim(),
      input.passwordHash,
      input.fullName,
      input.phone,
      input.role,
      input.status,
    ]
  );
  if (!row) throw new Error("Imeshindwa kutengeneza mtumiaji");
  return row;
}

export async function listPendingStaff(): Promise<UserRow[]> {
  return query<UserRow>(
    `SELECT * FROM users WHERE role = 'STAFF' AND status = 'PENDING' ORDER BY created_at ASC`
  );
}

export async function updateUserProfile(
  userId: string,
  patch: { fullName?: string; phone?: string }
): Promise<UserRow | null> {
  const columnMap: Record<string, unknown> = {
    full_name: patch.fullName,
    phone: patch.phone,
  };

  const fields: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return findUserById(userId);
  }

  params.push(userId);
  return queryOne<UserRow>(
    `UPDATE users SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [
    userId,
    passwordHash,
  ]);
}

export async function updateUserStatus(
  userId: string,
  status: "APPROVED" | "REJECTED" | "SUSPENDED"
): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `UPDATE users SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [userId, status]
  );
}
