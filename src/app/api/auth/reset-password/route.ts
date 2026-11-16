import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { withTransaction } from "@/lib/db";
import { allowFromIp, resetCodeMatches } from "@/lib/password-reset";
import {
  RESET_CODE_MAX_ATTEMPTS,
  consumeResetCode,
  takeResetAttempt,
} from "@/lib/repo/password-reset";
import { findUserByEmail } from "@/lib/repo/users";
import { resetPasswordSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

const INVALID = "Code sio sahihi au imeisha muda. Omba code mpya.";

/** Step 2 of "Umesahau password?": check the emailed code and set the new password. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data sio sahihi" }, { status: 400 });
  }
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  if (!allowFromIp(request, "forgot-verify", 20, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Majaribio mengi sana. Jaribu tena baada ya dakika 15." },
      { status: 429 }
    );
  }

  const { email, code, newPassword } = parsed.data;
  try {
    const user = await findUserByEmail(email.toLowerCase());
    if (!user || user.status === "REJECTED" || user.status === "SUSPENDED") {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    // Each code allows RESET_CODE_MAX_ATTEMPTS guesses, counted in the database.
    const attempt = await takeResetAttempt(user.id);
    if (!attempt) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }
    if (!resetCodeMatches(user.id, code, attempt.code_hash)) {
      const left = RESET_CODE_MAX_ATTEMPTS - attempt.attempts;
      return NextResponse.json(
        {
          error:
            left > 0
              ? `Code sio sahihi. Umebakiza majaribio ${left}.`
              : "Code sio sahihi. Majaribio yamekwisha, omba code mpya.",
        },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const ok = await withTransaction(async (client) => {
      if (!(await consumeResetCode(client, attempt.id, user.id))) return false;
      await client.query(
        `UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
        [user.id, passwordHash]
      );
      await logAudit(
        {
          userId: user.id,
          action: "PASSWORD_RESET",
          entity: "user",
          entityId: user.id,
          meta: { method: "email_code" },
        },
        client
      );
      return true;
    });
    if (!ok) {
      return NextResponse.json({ error: INVALID }, { status: 400 });
    }

    return NextResponse.json({
      message: "Password imebadilishwa. Sasa unaweza kuingia.",
    });
  } catch (error) {
    console.error("[reset-password] unexpected error:", error);
    return NextResponse.json(
      { error: "Hitilafu ya seva. Jaribu tena baadaye." },
      { status: 500 }
    );
  }
}
