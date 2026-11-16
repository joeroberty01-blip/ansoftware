import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outgoing email over SMTP. For Gmail: SMTP_USER is the address and
 * SMTP_PASS is a 16-letter App Password (Google account -> Security ->
 * 2-Step Verification -> App passwords), not the normal password.
 */
let transporter: Transporter | null = null;

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || "").replace(/\s+/g, ""),
    },
  });
  return transporter;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  if (!mailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      // Local development without SMTP: show the message in the server log.
      console.info(`[mail:dev] to=${input.to} subject=${input.subject}\n${input.text}`);
      return;
    }
    throw new Error("SMTP is not configured");
  }
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM || `Afya Nyumbani <${process.env.SMTP_USER}>`,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}
