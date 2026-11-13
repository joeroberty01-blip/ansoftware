import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth";
import { findUserByEmail, updateUserPassword } from "@/lib/repo/users";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = "Barua pepe au recovery code sio sahihi.";

// In-memory limits are best-effort only; serverless instances do not share state.
const recoveryAttempts = new Map<string, { count: number; resetAt: number }>();

function consumeRecoveryAttempt(request: Request, email: string): boolean {
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

function matchesRecoveryCode(candidate: string, expected: string): boolean {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
}

export async function POST(request: Request) {
  try {
    const recoverySecret = process.env.ADMIN_SIGNUP_SECRET;
    if (!recoverySecret) {
      return NextResponse.json(
        { error: "Password recovery is temporarily unavailable." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    if (!consumeRecoveryAttempt(request, email)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    if (!matchesRecoveryCode(parsed.data.code, recoverySecret)) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MESSAGE },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: INVALID_CREDENTIALS_MESSAGE },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await updateUserPassword(user.id, passwordHash);

    try {
      await logAudit({
        userId: user.id,
        action: "PASSWORD_RECOVERED",
        entity: "user",
        entityId: user.id,
        meta: { method: "admin_signup_secret", selfService: true },
      });
    } catch (error) {
      console.error("[auth/forgot-password] Audit log write failed:", error);
    }

    return NextResponse.json({
      message: "Password imebadilishwa. Sasa unaweza kuingia.",
    });
  } catch (error) {
    console.error("[auth/forgot-password] Password reset failed:", error);
    return NextResponse.json(
      { error: "Unable to reset your password right now. Please try again." },
      { status: 500 }
    );
  }
}
