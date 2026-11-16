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
  "Kama email hii imesajiliwa, tumetuma code ya tarakimu 6. Angalia inbox (na Spam).";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Step 1 of "Umesahau password?": email a one-time code. */
export async function POST(request: NextRequest) {
  if (!mailConfigured() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Huduma ya kutuma email haijawekwa bado. Wasiliana na Admin." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data sio sahihi" }, { status: 400 });
  }
  const parsed = forgotPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data sio sahihi" },
      { status: 400 }
    );
  }

  if (!allowFromIp(request, "forgot-request", 10, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Maombi mengi sana. Jaribu tena baada ya dakika 15." },
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
        subject: `Afya Nyumbani ERP: code yako ni ${code}`,
        text: [
          `Habari ${user.full_name},`,
          "",
          `Code yako ya kubadilisha password ni: ${code}`,
          "",
          `Itumie ndani ya dakika ${RESET_CODE_TTL_MINUTES}. Usimpe mtu yeyote code hii.`,
          "Kama hukuomba kubadilisha password, puuza ujumbe huu; password yako haitabadilika.",
          "",
          "Afya Nyumbani",
        ].join("\n"),
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#18181b">
<p>Habari ${escapeHtml(user.full_name)},</p>
<p>Code yako ya kubadilisha password ni:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0d4ea6">${code}</p>
<p>Itumie ndani ya dakika ${RESET_CODE_TTL_MINUTES}. Usimpe mtu yeyote code hii.</p>
<p style="color:#71717a">Kama hukuomba kubadilisha password, puuza ujumbe huu; password yako haitabadilika.</p>
<p>Afya Nyumbani</p>
</div>`,
      });
    } catch (mailError) {
      await deleteResetCode(codeId).catch(() => undefined);
      console.error("[forgot-password] email failed:", mailError);
      return NextResponse.json(
        { error: "Imeshindikana kutuma email kwa sasa. Jaribu tena baadaye." },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: SENT_MESSAGE });
  } catch (error) {
    console.error("[forgot-password] unexpected error:", error);
    return NextResponse.json(
      { error: "Hitilafu ya seva. Jaribu tena baadaye." },
      { status: 500 }
    );
  }
}
