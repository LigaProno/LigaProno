import { appBaseUrl } from "@/lib/email/time";
import { LIGA_PRONO } from "@/lib/auth-brand";

/** CID pentru logo-ul atașat de mailer — funcționează și fără URL public. */
export const EMAIL_LOGO_CID = "ligaprono-logo";

const COLORS = {
  pageBg: "#FFFFFF",
  card: LIGA_PRONO.navy,
  cardInner: LIGA_PRONO.navyLight,
  text: LIGA_PRONO.white,
  muted: LIGA_PRONO.textMuted,
  muted2: LIGA_PRONO.textSubtle,
  gold: LIGA_PRONO.gold,
  goldLight: LIGA_PRONO.goldLight,
  accent: "#BEF264",
  border: "rgba(255,255,255,0.12)",
  rowAlt: "rgba(255,255,255,0.04)",
} as const;

export type EmailCta = {
  label: string;
  href: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderEmailLayout(opts: {
  preheader: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
  cta?: EmailCta;
}): { html: string; text: string } {
  const base = appBaseUrl();
  const ctaHtml = opts.cta
    ? `
      <tr>
        <td align="center" style="padding:28px 0 8px;text-align:center;">
          <a href="${escapeHtml(opts.cta.href)}"
             style="display:inline-block;background:${COLORS.gold};color:${LIGA_PRONO.navyDark};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:8px;">
            ${escapeHtml(opts.cta.label)}
          </a>
        </td>
      </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.pageBg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(opts.preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.pageBg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${COLORS.card};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 32px 16px;border-bottom:1px solid ${COLORS.border};">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <img src="cid:${EMAIL_LOGO_CID}" width="40" height="40" alt="LigaProno"
                         style="display:block;width:40px;height:40px;border:0;border-radius:8px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;letter-spacing:0.04em;color:${COLORS.gold};font-weight:700;">
                      LigaProno
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${COLORS.text};font-weight:700;">
                ${escapeHtml(opts.title)}
              </h1>
              ${
                opts.subtitle
                  ? `<p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${COLORS.muted};">${escapeHtml(opts.subtitle)}</p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              ${opts.bodyHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${COLORS.border};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLORS.muted2};">
                Primești acest email pentru că ești membru pe
                <a href="${escapeHtml(base)}" style="color:${COLORS.goldLight};text-decoration:none;">LigaProno</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    `LigaProno`,
    opts.title,
    opts.subtitle ?? "",
    "",
    stripTags(opts.bodyHtml),
    opts.cta ? `${opts.cta.label}: ${opts.cta.href}` : "",
    "",
    `Primești acest email pentru că ești membru pe LigaProno — ${base}`,
  ].filter(Boolean);

  return { html, text: textParts.join("\n") };
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|h\d|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderDataTable(headers: string[], rows: string[][]): string {
  const head = headers
    .map(
      (h) =>
        `<th style="padding:10px 12px;text-align:left;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.muted};border-bottom:1px solid ${COLORS.border};">${escapeHtml(h)}</th>`,
    )
    .join("");

  const body = rows
    .map((row, i) => {
      const bg = i % 2 === 1 ? COLORS.rowAlt : "transparent";
      const cells = row
        .map(
          (cell, j) =>
            `<td style="padding:12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${j === row.length - 1 ? COLORS.accent : COLORS.text};border-bottom:1px solid ${COLORS.border};">${cell}</td>`,
        )
        .join("");
      return `<tr style="background:${bg};">${cells}</tr>`;
    })
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid ${COLORS.border};border-radius:12px;overflow:hidden;background:${COLORS.cardInner};">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>`;
}

export { COLORS };
