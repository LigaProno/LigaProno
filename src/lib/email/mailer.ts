import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import fs from "fs";
import path from "path";
import { EMAIL_LOGO_CID } from "@/lib/email/templates/layout";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let transporter: Transporter | null = null;
let logoAttachment:
  | { filename: string; content: Buffer; cid: string; contentType: string }
  | null
  | undefined;

function isEmailEnabled(): boolean {
  const raw = process.env.EMAIL_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off") return false;
  return true;
}

function getGmailCredentials(): { user: string; pass: string } | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return null;
  return { user, pass };
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM?.trim() ||
    "LigaProno <noreply@ligaprono.ro>"
  );
}

function getTransporter(): Transporter | null {
  const creds = getGmailCredentials();
  if (!creds) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: creds.user,
        pass: creds.pass,
      },
    });
  }
  return transporter;
}

function getLogoAttachment() {
  if (logoAttachment !== undefined) return logoAttachment;
  const logoPath = path.join(process.cwd(), "public", "logo-liga-prono.png");
  try {
    logoAttachment = {
      filename: "logo-liga-prono.png",
      content: fs.readFileSync(logoPath),
      cid: EMAIL_LOGO_CID,
      contentType: "image/png",
    };
  } catch {
    console.warn("[email] logo not found at", logoPath);
    logoAttachment = null;
  }
  return logoAttachment;
}

export function emailConfigStatus(): {
  enabled: boolean;
  configured: boolean;
  testTo: string | null;
  testLimit: number | null;
  from: string;
} {
  const testTo = process.env.EMAIL_TEST_TO?.trim() || null;
  return {
    enabled: isEmailEnabled(),
    configured: getGmailCredentials() != null,
    testTo,
    testLimit: testTo ? getEmailTestLimit() : null,
    from: getFromAddress(),
  };
}

/** Câte mailuri SMTP reale se trimit când EMAIL_TEST_TO e setat (default 1). */
function getEmailTestLimit(): number {
  const raw = process.env.EMAIL_TEST_LIMIT?.trim();
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.floor(n);
}

let testEmailsSent = 0;

export function isEmailTestMode(): boolean {
  return Boolean(process.env.EMAIL_TEST_TO?.trim());
}

/** True dacă mai putem trimite un sample în modul test (fără a rezerva slotul). */
export function canSendTestEmail(): boolean {
  if (!isEmailTestMode()) return true;
  return testEmailsSent < getEmailTestLimit();
}

/**
 * Trimite un email prin Gmail SMTP.
 * Dacă EMAIL_TEST_TO e setat, mesajele merg doar acolo (subject prefixat),
 * și doar primele EMAIL_TEST_LIMIT (default 1) sunt trimise efectiv.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<{ ok: true; to: string } | { ok: false; reason: string }> {
  if (!isEmailEnabled()) {
    return { ok: false, reason: "EMAIL_ENABLED is off" };
  }

  const transport = getTransporter();
  if (!transport) {
    return { ok: false, reason: "Missing GMAIL_USER or GMAIL_APP_PASSWORD" };
  }

  const testTo = process.env.EMAIL_TEST_TO?.trim();
  if (testTo) {
    const limit = getEmailTestLimit();
    // Rezervă sync înainte de await — evită curse între job-uri paralele.
    if (testEmailsSent >= limit) {
      return {
        ok: false,
        reason: `EMAIL_TEST_LIMIT reached (${limit})`,
      };
    }
    testEmailsSent += 1;
  }

  const to = testTo || input.to;
  const subject = testTo
    ? `[TEST → ${input.to}] ${input.subject}`
    : input.subject;

  const logo = getLogoAttachment();

  try {
    await transport.sendMail({
      from: getFromAddress(),
      to,
      subject,
      html: input.html,
      text: input.text,
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      attachments: logo
        ? [
            {
              filename: logo.filename,
              content: logo.content,
              cid: logo.cid,
              contentType: logo.contentType,
              contentDisposition: "inline",
            },
          ]
        : undefined,
    });
    return { ok: true, to };
  } catch (error) {
    if (testTo && testEmailsSent > 0) testEmailsSent -= 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] send failed", { to: input.to, message });
    return { ok: false, reason: message };
  }
}
