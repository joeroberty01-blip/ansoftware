import { query, queryOne, withTransaction } from "../db";
import { hashPassword } from "../auth";
import type { StaffRow } from "../types";

export interface StaffWithUser extends StaffRow {
  full_name: string;
  email: string;
  phone: string | null;
  user_status: string;
}

export async function createStaffProfile(input: {
  userId: string;
  profession: string;
  baseSalary: string;
  startDate: string;
}): Promise<StaffRow> {
  const row = await queryOne<StaffRow>(
    `INSERT INTO staff (user_id, profession, base_salary, start_date)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.userId, input.profession, input.baseSalary, input.startDate]
  );
  if (!row) throw new Error("Imeshindwa kutengeneza wasifu wa staff");
  return row;
}

export async function listStaffWithUser(
  userStatus?: string
): Promise<StaffWithUser[]> {
  if (userStatus) {
    return query<StaffWithUser>(
      `SELECT s.*, u.full_name, u.email, u.phone, u.status as user_status
       FROM staff s
       JOIN users u ON u.id = s.user_id
       WHERE u.status = $1
       ORDER BY s.created_at DESC`,
      [userStatus]
    );
  }
  return query<StaffWithUser>(
    `SELECT s.*, u.full_name, u.email, u.phone, u.status as user_status
     FROM staff s
     JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC`
  );
}

export async function getStaffById(id: string): Promise<StaffWithUser | null> {
  return queryOne<StaffWithUser>(
    `SELECT s.*, u.full_name, u.email, u.phone, u.status as user_status
     FROM staff s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [id]
  );
}

export async function getStaffByUserId(
  userId: string
): Promise<StaffWithUser | null> {
  return queryOne<StaffWithUser>(
    `SELECT s.*, u.full_name, u.email, u.phone, u.status as user_status
     FROM staff s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1`,
    [userId]
  );
}

export async function nextStaffNumber(
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: { count: string }[] }> }
): Promise<string> {
  const year = new Date().getFullYear();
  const countRes = await client.query(
    `SELECT COUNT(*)::text AS count FROM staff WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year]
  );
  const seq = parseInt(countRes.rows[0]?.count ?? "0", 10) + 1;
  return `ANH-${year}-${String(seq).padStart(4, "0")}`;
}

/**
 * Admin adds a Staff member directly (no self-signup approval flow):
 * creates the login-capable `users` row (status APPROVED immediately)
 * and the `staff` row together, atomically.
 */
export async function createStaffWithUser(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  profession: string;
  baseSalary: string;
  allowances: string;
  startDate: string;
  licenseNumber: string | null;
  licenseExpiryDate: string | null;
}): Promise<StaffWithUser> {
  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (client) => {
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, status)
       VALUES ($1, $2, $3, $4, 'STAFF', 'APPROVED')
       RETURNING *`,
      [input.email.toLowerCase().trim(), passwordHash, input.fullName, input.phone]
    );
    const user = userRes.rows[0];

    const staffNumber = await nextStaffNumber(client);

    const staffRes = await client.query<StaffRow>(
      `INSERT INTO staff
         (user_id, staff_number, profession, base_salary, allowances, start_date, license_number, license_expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        user.id,
        staffNumber,
        input.profession,
        input.baseSalary,
        input.allowances,
        input.startDate,
        input.licenseNumber,
        input.licenseExpiryDate,
      ]
    );
    const staff = staffRes.rows[0];

    return {
      ...staff,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      user_status: user.status,
    };
  });
}

/**
 * Staff records are never hard-deleted — payrolls.staff_id cascades on
 * delete, which would erase the person's entire paid-salary history (a
 * financial audit trail). "Removing" a staff member instead deactivates
 * them: employment_status -> TERMINATED and their login is blocked
 * (users.status -> SUSPENDED), in one transaction.
 */
export async function deactivateStaff(staffId: string): Promise<StaffRow | null> {
  return withTransaction(async (client) => {
    const staffRes = await client.query<StaffRow>(
      `UPDATE staff SET employment_status = 'TERMINATED', updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [staffId]
    );
    const staff = staffRes.rows[0];
    if (!staff) return null;

    await client.query(
      `UPDATE users SET status = 'SUSPENDED', updated_at = now() WHERE id = $1`,
      [staff.user_id]
    );

    return staff;
  });
}

export async function updateStaffProfile(
  staffId: string,
  patch: {
    profession?: string;
    licenseNumber?: string | null;
    licenseExpiryDate?: string | null;
    employmentStatus?: string;
    baseSalary?: string;
    allowances?: string;
    startDate?: string;
    photoUrl?: string | null;
  }
): Promise<StaffRow | null> {
  const fields: string[] = [];
  const params: unknown[] = [];

  const columnMap: Record<string, unknown> = {
    profession: patch.profession,
    license_number: patch.licenseNumber,
    license_expiry_date: patch.licenseExpiryDate,
    employment_status: patch.employmentStatus,
    base_salary: patch.baseSalary,
    allowances: patch.allowances,
    start_date: patch.startDate,
    photo_url: patch.photoUrl,
  };

  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      params.push(value);
      fields.push(`${column} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    return queryOne<StaffRow>(`SELECT * FROM staff WHERE id = $1`, [staffId]);
  }

  params.push(staffId);
  return queryOne<StaffRow>(
    `UPDATE staff SET ${fields.join(", ")}, updated_at = now()
     WHERE id = $${params.length}
     RETURNING *`,
    params
  );
}

export async function countActiveStaff(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text as count FROM staff WHERE employment_status = 'ACTIVE'`
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

export interface StaffStatusCounts {
  active: number;
  onLeave: number;
  inactive: number;
  terminated: number;
}

/**
 * "On leave" = ACTIVE staff with an APPROVED leave request covering today.
 * The rest of "active" staff are treated as available/on-duty.
 */
export async function getStaffStatusCounts(): Promise<StaffStatusCounts> {
  const rows = await query<{ bucket: string; count: string }>(
    `SELECT
       CASE
         WHEN s.employment_status = 'ACTIVE' AND EXISTS (
           SELECT 1 FROM leave_requests lr
           WHERE lr.staff_id = s.id
             AND lr.status = 'APPROVED'
             AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
         ) THEN 'ON_LEAVE'
         ELSE s.employment_status::text
       END AS bucket,
       COUNT(*)::text AS count
     FROM staff s
     GROUP BY bucket`
  );
  const counts: StaffStatusCounts = { active: 0, onLeave: 0, inactive: 0, terminated: 0 };
  for (const row of rows) {
    const n = parseInt(row.count, 10);
    if (row.bucket === "ACTIVE") counts.active = n;
    else if (row.bucket === "ON_LEAVE") counts.onLeave = n;
    else if (row.bucket === "INACTIVE") counts.inactive = n;
    else if (row.bucket === "TERMINATED") counts.terminated = n;
  }
  return counts;
}

/** Total staff count now vs. as of ~30 days ago (staff.created_at cutoff). */
export async function getStaffGrowth(): Promise<{
  totalNow: number;
  totalMonthAgo: number;
}> {
  const row = await queryOne<{ total_now: string; total_month_ago: string }>(
    `SELECT
       COUNT(*)::text AS total_now,
       COUNT(*) FILTER (WHERE created_at <= now() - interval '30 days')::text AS total_month_ago
     FROM staff`
  );
  return {
    totalNow: parseInt(row?.total_now ?? "0", 10),
    totalMonthAgo: parseInt(row?.total_month_ago ?? "0", 10),
  };
}

const DEPARTMENT_BY_PROFESSION: Record<string, string> = {
  NURSE: "Nursing",
  DOCTOR: "Medical",
  CHW: "Support",
  ADMIN_STAFF: "Admin",
};

export interface DepartmentCount {
  department: string;
  count: number;
}

/** Staff counts grouped by a department derived from profession. */
export async function getStaffByDepartment(): Promise<DepartmentCount[]> {
  const rows = await query<{ profession: string; count: string }>(
    `SELECT profession, COUNT(*)::text AS count
     FROM staff
     WHERE employment_status != 'TERMINATED'
     GROUP BY profession`
  );
  const totals = new Map<string, number>();
  for (const row of rows) {
    const dept = DEPARTMENT_BY_PROFESSION[row.profession] ?? row.profession;
    totals.set(dept, (totals.get(dept) ?? 0) + parseInt(row.count, 10));
  }
  return Array.from(totals.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export async function listExpiringLicenses(
  withinDays: number
): Promise<StaffWithUser[]> {
  return query<StaffWithUser>(
    `SELECT s.*, u.full_name, u.email, u.phone, u.status as user_status
     FROM staff s
     JOIN users u ON u.id = s.user_id
     WHERE s.license_expiry_date IS NOT NULL
       AND s.license_expiry_date <= (CURRENT_DATE + $1::int)
     ORDER BY s.license_expiry_date ASC`,
    [withinDays]
  );
}
