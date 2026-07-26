import {
  escapeHtml,
  renderDataTable,
  renderEmailLayout,
} from "@/lib/email/templates/layout";
import { LIGA_PRONO } from "@/lib/auth-brand";

export type ReminderMatchRow = {
  tournamentName: string;
  fixture: string;
  kickoff: string;
};

export function renderPredictionReminderEmail(opts: {
  firstName: string | null;
  dateLabel: string;
  matches: ReminderMatchRow[];
  ctaHref: string;
}): { subject: string; html: string; text: string } {
  const name = opts.firstName?.trim() || "acolo";
  const count = opts.matches.length;
  const subject =
    count === 1
      ? "Mâine ai 1 meci fără pronostic — nu uita să pui!"
      : `Mâine ai ${count} meciuri fără pronostic — nu uita să pui!`;

  const rows = opts.matches.map((m) => [
    escapeHtml(m.fixture),
    escapeHtml(m.kickoff),
    escapeHtml(m.tournamentName),
  ]);

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Mâine, <strong style="color:${LIGA_PRONO.white};">${escapeHtml(opts.dateLabel)}</strong>, mai ai
      <strong style="color:#BEF264;">${count}</strong> ${count === 1 ? "meci" : "meciuri"} fără pronostic.
      Adaugă-le din timp, înainte de fluierul de start.
    </p>
    ${renderDataTable(["Meci", "Ora", "Turneu"], rows)}
  `;

  const rendered = renderEmailLayout({
    preheader: subject,
    title: "Nu uita să pui pronosticuri!",
    subtitle: "Meciurile de mâine încă așteaptă predicțiile tale.",
    bodyHtml,
    cta: { label: "Completează pronosticurile", href: opts.ctaHref },
  });

  return { subject, ...rendered };
}
