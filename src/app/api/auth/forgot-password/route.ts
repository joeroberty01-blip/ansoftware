import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { findUserByEmail, updateUserPassword } from "@/lib/repo/users";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const GENERIC_ERROR = "Barua pepe au recovery code sio sahihi.";

// Basic brute-force protection: max 5 attempts per IP+email per 15 minutes.
// NOTE: in-memory, so on serverless it is per-instance only (best effort).
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so both buffers have equal length for timingSafeEqual.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SIGNUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Huduma hii haijawashwa. Wasiliana na Admin." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
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

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (tooManyAttempts(`${ip}:${email.toLowerCase().trim()}`)) {
    return NextResponse.json(
      { error: "Majaribio mengi sana. Jaribu tena baada ya dakika 15." },
      { status: 429 }
    );
  }

  try {
    const codeOk = safeEqual(code, secret);
    const user = await findUserByEmail(email);

    // Same response for "unknown email" and "wrong code" (no enumeration).
    if (!user || !codeOk) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(user.id, newHash);

    try {
      await logAudit({
        userId: user.id,
        action: "PASSWORD_RESET",
        entity: "user",
        entityId: user.id,
        meta: { method: "recovery_code" },
      });
    } catch (auditErr) {
      console.error("[forgot-password] audit log failed:", auditErr);
    }

    return NextResponse.json({
      message: "Password imebadilishwa. Sasa unaweza kuingia.",
    });
  } catch (err) {
    console.error("[forgot-password] unexpected error:", err);
    return NextResponse.json(
      { error: "Hitilafu ya seva. Jaribu tena baadaye." },
      { status: 500 }
    );
  }
}
