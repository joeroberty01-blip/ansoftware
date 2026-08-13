import { NextRequest, NextResponse } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import {
  adminSignupSchema,
  staffSignupSchema,
} from "@/lib/validation/auth";
import { countAdmins, createUser, findUserByEmail } from "@/lib/repo/users";
import { withTransaction } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const accountType = body.accountType as "ADMIN" | "STAFF";

  const existing = await findUserByEmail(body.email ?? "");
  if (existing) {
    return NextResponse.json(
      { error: "Barua pepe hii tayari imesajiliwa." },
      { status: 400 }
    );
  }

  if (accountType === "ADMIN") {
    const parsed = adminSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
        { status: 400 }
      );
    }
    const { fullName, email, phone, password, adminSecretCode } =
      parsed.data;

    if (adminSecretCode !== process.env.ADMIN_SIGNUP_SECRET) {
      return NextResponse.json(
        { error: "Admin secret code sio sahihi." },
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
          ? "Admin wa kwanza ametengenezwa kikamilifu."
          : "Admin mpya ametengenezwa kikamilifu.",
      user: { id: user.id, role: user.role },
    });
  }

  if (accountType === "STAFF") {
    const parsed = staffSignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
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
      await client.query(
        `INSERT INTO staff (user_id, profession, base_salary, start_date)
         VALUES ($1, $2, 0, CURRENT_DATE)`,
        [user.id, profession]
      );
      return user;
    });

    return NextResponse.json({
      message:
        "Umesajiliwa kikamilifu. Akaunti yako inasubiri idhini ya Admin kabla hujaweza kuingia.",
      user: { id: result.id, status: result.status },
    });
  }

  return NextResponse.json(
    { error: "accountType lazima iwe ADMIN au STAFF" },
    { status: 400 }
  );
}
