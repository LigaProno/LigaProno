import {
  escapeHtml,
  renderEmailLayout,
} from "@/lib/email/templates/layout";
import { LIGA_PRONO } from "@/lib/auth-brand";
import { SUPPORT_CATEGORY_LABEL } from "@/lib/support-display";
import type { SupportCategory } from "@prisma/client";
import { appBaseUrl } from "@/lib/email/time";

function metaRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${LIGA_PRONO.textSubtle};width:110px;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${LIGA_PRONO.white};vertical-align:top;">
        ${value}
      </td>
    </tr>`;
}

function quoteBlock(text: string): string {
  return `
    <div style="margin-top:16px;padding:16px 18px;border-left:3px solid ${LIGA_PRONO.gold};background:rgba(255,255,255,0.05);border-radius:0 10px 10px 0;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${LIGA_PRONO.textMuted};white-space:pre-wrap;">
        ${escapeHtml(text)}
      </p>
    </div>`;
}

/** Confirmare: tichetul a fost înregistrat. */
export function renderSupportReceivedEmail(opts: {
  name: string;
  category: SupportCategory;
  message: string;
  ticketId: string;
}): { subject: string; html: string; text: string } {
  const categoryLabel = SUPPORT_CATEGORY_LABEL[opts.category] ?? opts.category;
  const subject = `Am primit mesajul tău — ${categoryLabel}`;
  const base = appBaseUrl();

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(opts.name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Am înregistrat mesajul tău de support. Echipa LigaProno îl va verifica și îți răspunde cât de curând.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;width:100%;">
      ${metaRow("Categorie", escapeHtml(categoryLabel))}
      ${metaRow("ID tichet", `<span style="font-family:Consolas,monospace;font-size:12px;color:${LIGA_PRONO.gold};">${escapeHtml(opts.ticketId.slice(-8).toUpperCase())}</span>`)}
    </table>
    ${quoteBlock(opts.message)}
  `;

  return {
    subject,
    ...renderEmailLayout({
      preheader: "Mesajul tău de support a fost înregistrat.",
      title: "Mesaj primit",
      subtitle: "Confirmarea înregistrării tichetului tău.",
      bodyHtml,
      cta: { label: "Vezi tichetele mele", href: `${base}/support` },
    }),
  };
}

/** Actualizare: adminul a răspuns pe tichet. */
export function renderSupportReplyEmail(opts: {
  name: string;
  category: SupportCategory;
  replyBody: string;
  ticketId: string;
}): { subject: string; html: string; text: string } {
  const categoryLabel = SUPPORT_CATEGORY_LABEL[opts.category] ?? opts.category;
  const subject = `Ai un răspuns la tichetul tău — ${categoryLabel}`;
  const base = appBaseUrl();

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(opts.name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Echipa LigaProno ți-a răspuns la tichetul
      <strong style="color:${LIGA_PRONO.gold};">${escapeHtml(opts.ticketId.slice(-8).toUpperCase())}</strong>
      (${escapeHtml(categoryLabel)}).
    </p>
    ${quoteBlock(opts.replyBody)}
  `;

  return {
    subject,
    ...renderEmailLayout({
      preheader: "Ai un răspuns nou la support.",
      title: "Răspuns nou",
      subtitle: "Actualizare pe tichetul tău de support.",
      bodyHtml,
      cta: { label: "Citește răspunsul", href: `${base}/support` },
    }),
  };
}

/** Tichet marcat rezolvat. */
export function renderSupportResolvedEmail(opts: {
  name: string;
  category: SupportCategory;
  ticketId: string;
}): { subject: string; html: string; text: string } {
  const categoryLabel = SUPPORT_CATEGORY_LABEL[opts.category] ?? opts.category;
  const subject = `Tichet rezolvat — ${categoryLabel}`;
  const base = appBaseUrl();

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(opts.name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Tichetul
      <strong style="color:${LIGA_PRONO.gold};">${escapeHtml(opts.ticketId.slice(-8).toUpperCase())}</strong>
      (${escapeHtml(categoryLabel)}) a fost marcat ca
      <strong style="color:#BEF264;">rezolvat</strong>.
      Dacă problema persistă, poți deschide un tichet nou oricând.
    </p>
  `;

  return {
    subject,
    ...renderEmailLayout({
      preheader: "Tichetul tău a fost rezolvat.",
      title: "Tichet rezolvat",
      subtitle: "Am închis solicitarea ta de support.",
      bodyHtml,
      cta: { label: "Deschide support", href: `${base}/support` },
    }),
  };
}

/** Notificare internă către admini când apare un tichet nou. */
export function renderSupportAdminNotifyEmail(opts: {
  name: string;
  email: string;
  category: SupportCategory;
  message: string;
  ticketId: string;
}): { subject: string; html: string; text: string } {
  const categoryLabel = SUPPORT_CATEGORY_LABEL[opts.category] ?? opts.category;
  const subject = `[Support] Tichet nou — ${categoryLabel} de la ${opts.name}`;
  const base = appBaseUrl();

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      A sosit un tichet nou pe LigaProno.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:18px;width:100%;">
      ${metaRow("De la", escapeHtml(opts.name))}
      ${metaRow("Email", escapeHtml(opts.email))}
      ${metaRow("Categorie", escapeHtml(categoryLabel))}
      ${metaRow("ID", `<span style="font-family:Consolas,monospace;font-size:12px;color:${LIGA_PRONO.gold};">${escapeHtml(opts.ticketId.slice(-8).toUpperCase())}</span>`)}
    </table>
    ${quoteBlock(opts.message)}
  `;

  return {
    subject,
    ...renderEmailLayout({
      preheader: `Tichet nou: ${categoryLabel}`,
      title: "Tichet nou",
      subtitle: "Notificare internă pentru admini.",
      bodyHtml,
      cta: { label: "Deschide panoul admin", href: `${base}/admin?tab=support` },
    }),
  };
}
