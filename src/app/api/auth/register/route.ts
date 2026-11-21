import { NextRequest, NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import {
  adminSignupSchema,
  staffSignupSchema,
} from "@/lib/validation/auth";
import { countAdmins, createUser, findUserByEmail } from "@/lib/repo/users";
import { nextStaffNumber } from "@/lib/repo/staff";
import { withTransaction } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const accountType = body.accountType as "ADMIN" | "STAFF";

  const existing = await findUserByEmail(body.email ?? "");
  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered." },
      { status: 400 }
    );
  }

  if (accountType === "ADMIN") {
    const parsed = adminSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }
    const { fullName, email, phone, password, adminSecretCode } =
      parsed.data;

    if (adminSecretCode !== process.env.ADMIN_SIGNUP_SECRET) {
      return NextResponse.json(
        { error: "The Admin secret code is incorrect." },
        { status: 403 }
      );
    }

    const existingAdmins = await countAdmins();
    const passwordHash = await hashPassword(password);
    const user = await createUser({
      email,
      passwordHash,
      fullName,
      phone,
      role: "ADMIN",
      status: "APPROVED",
    });

    await setSessionCookie({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      status: user.status,
    });

    return NextResponse.json({
      message:
        existingAdmins === 0
          ? "First Admin created successfully."
          : "New Admin created successfully.",
      user: { id: user.id, role: user.role },
    });
  }

  if (accountType === "STAFF") {
    const parsed = staffSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid data" },
        { status: 400 }
      );
    }
    const { fullName, email, phone, password, profession } = parsed.data;
    const passwordHash = await hashPassword(password);

    const result = await withTransaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, full_name, phone, role, status)
         VALUES ($1, $2, $3, $4, 'STAFF', 'PENDING')
         RETURNING *`,
        [email.toLowerCase().trim(), passwordHash, fullName, phone]
      );
      const user = userRes.rows[0];
      const staffNumber = await nextStaffNumber(client);
      await client.query(
        `INSERT INTO staff (user_id, staff_number, profession, base_salary, start_date)
         VALUES ($1, $2, $3, 0, CURRENT_DATE)`,
        [user.id, staffNumber, profession]
      );
      return user;
    });

    return NextResponse.json({
      message:
        "Registration successful. Your account needs Admin approval before you can sign in.",
      user: { id: result.id, status: result.status },
    });
  }

  return NextResponse.json(
    { error: "accountType must be ADMIN or STAFF" },
    { status: 400 }
  );
}
