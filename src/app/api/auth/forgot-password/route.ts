import { NextRequest, NextResponse } from "next/server";
import { mailConfigured, sendMail } from "@/lib/mail";
import { allowFromIp, clientIp, hashResetCode, newResetCode } from "@/lib/password-reset";
import {
  RESET_CODE_TTL_MINUTES,
  createResetCode,
  deleteResetCode,
  recentResetCodeStats,
} from "@/lib/repo/password-reset";
import { findUserByEmail } from "@/lib/repo/users";
import { forgotPasswordRequestSchema } from "@/lib/validation/auth";

export const runtime = "nodejs";

// Same answer whether or not the email exists, so it can't be used to probe accounts.
const SENT_MESSAGE =
  "If this email is registered, we've sent a 6-digit code. Check your inbox (and Spam).";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Step 1 of "Forgot password?": email a one-time code. */
export async function POST(request: NextRequest) {
  if (!mailConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Email sending isn't set up yet. Contact the Admin." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const parsed = forgotPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid data" },
      { status: 400 }
    );
  }

  if (!allowFromIp(request, "forgot-request", 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  try {
    const user = await findUserByEmail(email);
    if (!user || user.status === "REJECTED" || user.status === "SUSPENDED") {
      return NextResponse.json({ message: SENT_MESSAGE });
    }

    // At most one code a minute and five an hour per account.
    const stats = await recentResetCodeStats(user.id);
    if (
      stats.lastHour >= 5 ||
      (stats.secondsSinceLast !== null && stats.secondsSinceLast < 60)
    ) {
      return NextResponse.json({ message: SENT_MESSAGE });
    }

    const code = newResetCode();
    const codeId = await createResetCode({
      userId: user.id,
      codeHash: hashResetCode(user.id, code),
      requestIp: clientIp(request),
    });

    try {
      await sendMail({
        to: user.email,
        subject: `Afya Nyumbani ERP: your code is ${code}`,
        text: [
          `Hello ${user.full_name},`,
          "",
          `Your password reset code is: ${code}`,
          "",
          `Use it within ${RESET_CODE_TTL_MINUTES} minutes. Don't share this code with anyone.`,
          "If you didn't ask to reset your password, ignore this message; your password won't change.",
          "",
          "Afya Nyumbani",
        ].join("\n"),
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#18181b">
<p>Hello ${escapeHtml(user.full_name)},</p>
<p>Your password reset code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0d4ea6">${code}</p>
<p>Use it within ${RESET_CODE_TTL_MINUTES} minutes. Don't share this code with anyone.</p>
<p style="color:#71717a">If you didn't ask to reset your password, ignore this message; your password won't change.</p>
<p>Afya Nyumbani</p>
</div>`,
      });
    } catch (mailError) {
      await deleteResetCode(codeId).catch(() => undefined);
      console.error("[forgot-password] email failed:", mailError);
      return NextResponse.json(
        { error: "Could not send the email right now. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: SENT_MESSAGE });
  } catch (error) {
    console.error("[forgot-password] unexpected error:", error);
    return NextResponse.json(
      { error: "Server error. Please try again later." },
      { status: 500 }
    );
  }
}
