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
  whenLabel?: string;
};

/** Câte zile până la meciuri: 0 = azi, 1 = mâine, 2 = poimâine. */
export type ReminderDaysAhead = 0 | 1 | 2;

export function reminderWhenShort(daysAhead: ReminderDaysAhead): string {
  if (daysAhead === 0) return "Astăzi";
  if (daysAhead === 1) return "Mâine";
  return "Peste 2 zile";
}

function reminderWhenLong(daysAhead: ReminderDaysAhead): string {
  if (daysAhead === 0) return "astăzi";
  if (daysAhead === 1) return "mâine";
  return "peste 2 zile";
}

export function renderPredictionReminderEmail(opts: {
  firstName: string | null;
  dateLabel: string;
  matches: ReminderMatchRow[];
  ctaHref: string;
  daysAhead?: ReminderDaysAhead;
}): { subject: string; html: string; text: string } {
  const name = opts.firstName?.trim() || "acolo";
  const count = opts.matches.length;
  const daysAhead = opts.daysAhead ?? 2;
  const whenShort = reminderWhenShort(daysAhead);
  const whenLong = reminderWhenLong(daysAhead);
  const subtitle =
    daysAhead === 0
      ? "Meciurile de astăzi încă așteaptă predicțiile tale."
      : daysAhead === 1
        ? "Meciurile de mâine încă așteaptă predicțiile tale."
        : "Ai 2 zile la dispoziție pentru meciurile din listă.";

  const subject =
    count === 1
      ? `${whenShort} ai 1 meci fără pronostic — nu uita să pui!`
      : `${whenShort} ai ${count} meciuri fără pronostic — nu uita să pui!`;

  const hasWhen = opts.matches.some((m) => m.whenLabel);
  const rows = opts.matches.map((m) => {
    const kickoff = m.whenLabel ? `${m.whenLabel} · ${m.kickoff}` : m.kickoff;
    return [
      escapeHtml(m.fixture),
      escapeHtml(kickoff),
      escapeHtml(m.tournamentName),
    ];
  });

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      ${
        hasWhen
          ? `În următoarele zile mai ai`
          : `Pe <strong style="color:${LIGA_PRONO.white};">${escapeHtml(opts.dateLabel)}</strong> (${whenLong}) mai ai`
      }
      <strong style="color:#BEF264;">${count}</strong> ${count === 1 ? "meci" : "meciuri"} fără pronostic.
      Adaugă-le din timp, înainte de fluierul de start.
    </p>
    ${renderDataTable(["Meci", "Ora", "Turneu"], rows)}
  `;

  const rendered = renderEmailLayout({
    preheader: subject,
    title: "Nu uita să pui pronosticuri!",
    subtitle,
    bodyHtml,
    cta: { label: "Completează pronosticurile", href: opts.ctaHref },
  });

  return { subject, ...rendered };
}
