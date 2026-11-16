import "server-only";
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function key(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET haijawekwa");
  return createHmac("sha256", secret).update("password-reset-code").digest("hex");
}

export function newResetCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Codes are stored only as a keyed hash tied to the user. */
export function hashResetCode(userId: string, code: string): string {
  return createHmac("sha256", key()).update(`${userId}:${code}`).digest("hex");
}

export function resetCodeMatches(userId: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashResetCode(userId, code), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

/** Small per-instance limiter: a first line of defence before the database. */
const hits = new Map<string, { count: number; resetAt: number }>();

export function allowFromIp(
  request: NextRequest,
  bucket: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  const k = createHash("sha256")
    .update(`${bucket}\0${clientIp(request) ?? "unknown"}`)
    .digest("hex");
  const cur = hits.get(k);
  if (!cur || cur.resetAt <= now) {
    hits.set(k, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}
