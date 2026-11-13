import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { findUserByEmail, updateUserPassword } from "@/lib/repo/users";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = "Barua pepe au recovery code sio sahihi.";
const recoveryAttempts = new Map<string, { count: number; resetAt: number }>();

function consumeRecoveryAttempt(request: NextRequest, email: string): boolean {
  const now = Date.now();
  for (const [key, value] of recoveryAttempts) {
    if (value.resetAt <= now) recoveryAttempts.delete(key);
  }

  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwardedIp || "unknown";
  const key = createHash("sha256").update(`${ip}\0${email}`).digest("hex");
  const current = recoveryAttempts.get(key);

  if (!current || current.resetAt <= now) {
    recoveryAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

function safeEqual(candidate: string, expected: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SIGNUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Huduma hii haijawashwa. Wasiliana na Admin." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data sio sahihi" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  const { email, code, newPassword } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  if (!consumeRecoveryAttempt(request, normalizedEmail)) {
    return NextResponse.json(
      { error: "Majaribio mengi sana. Jaribu tena baada ya dakika 15." },
      { status: 429 }
    );
  }

  try {
    const codeIsValid = safeEqual(code, secret);
    const user = await findUserByEmail(normalizedEmail);

    if (!user || !codeIsValid) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MESSAGE },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await updateUserPassword(user.id, passwordHash);

    try {
      await logAudit({
        userId: user.id,
        action: "PASSWORD_RESET",
        entity: "user",
        entityId: user.id,
        meta: { method: "recovery_code" },
      });
    } catch (auditError) {
      console.error("[forgot-password] audit log failed:", auditError);
    }

    return NextResponse.json({
      message: "Password imebadilishwa. Sasa unaweza kuingia.",
    });
  } catch (error) {
    console.error("[forgot-password] unexpected error:", error);
    return NextResponse.json(
      { error: "Hitilafu ya seva. Jaribu tena baadaye." },
      { status: 500 }
    );
  }
}
