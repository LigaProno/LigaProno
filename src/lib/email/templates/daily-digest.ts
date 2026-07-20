import {
  escapeHtml,
  renderDataTable,
  renderEmailLayout,
} from "@/lib/email/templates/layout";
import { LIGA_PRONO } from "@/lib/auth-brand";

export type DigestMatchRow = {
  tournamentName: string;
  fixture: string;
  prediction: string;
  result: string;
  points: string;
};

export function renderDailyDigestEmail(opts: {
  firstName: string | null;
  dateLabel: string;
  totalPoints: number;
  matches: DigestMatchRow[];
  ctaHref: string;
}): { subject: string; html: string; text: string } {
  const name = opts.firstName?.trim() || "acolo";
  const pts = Number.isInteger(opts.totalPoints)
    ? String(opts.totalPoints)
    : opts.totalPoints.toFixed(2);
  const subject = `Rezumatul zilei: ${pts} puncte`;

  const rows = opts.matches.map((m) => [
    `<div style="font-weight:600;">${escapeHtml(m.fixture)}</div><div style="font-size:11px;color:${LIGA_PRONO.textSubtle};margin-top:2px;">${escapeHtml(m.tournamentName)}</div>`,
    escapeHtml(m.prediction),
    escapeHtml(m.result),
    escapeHtml(m.points),
  ]);

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Iată cum ți-au mers pronosticurile din
      <strong style="color:${LIGA_PRONO.white};">${escapeHtml(opts.dateLabel)}</strong>.
      Ai acumulat
      <strong style="color:#BEF264;">${escapeHtml(pts)} puncte</strong>.
    </p>
    ${renderDataTable(["Meci", "Pronostic", "Rezultat", "Puncte"], rows)}
  `;

  const rendered = renderEmailLayout({
    preheader: `${pts} puncte din ziua ${opts.dateLabel}`,
    title: "Rezumatul zilei",
    subtitle: "Predicțiile tale, scorurile reale și punctele câștigate.",
    bodyHtml,
    cta: { label: "Vezi clasamentul", href: opts.ctaHref },
  });

  return { subject, ...rendered };
}
