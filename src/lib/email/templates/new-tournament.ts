import {
  escapeHtml,
  renderDataTable,
  renderEmailLayout,
} from "@/lib/email/templates/layout";
import { LIGA_PRONO } from "@/lib/auth-brand";

export type NewTournamentPrizeRow = {
  place: string;
  prize: string;
};

export function renderNewPublicTournamentEmail(opts: {
  firstName: string | null;
  tournamentName: string;
  competitionLabel: string;
  detailLine: string | null;
  prizes: NewTournamentPrizeRow[];
  ctaHref: string;
}): { subject: string; html: string; text: string } {
  const name = opts.firstName?.trim() || "acolo";
  const subject = `Turneu nou: ${opts.tournamentName} — ești înscris`;

  const prizeHtml =
    opts.prizes.length > 0
      ? renderDataTable(
          ["Loc", "Premiu"],
          opts.prizes.map((p) => [escapeHtml(p.place), escapeHtml(p.prize)]),
        )
      : "";

  const detailHtml = opts.detailLine
    ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:${LIGA_PRONO.textMuted};">${escapeHtml(opts.detailLine)}</p>`
    : "";

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      A apărut un turneu public nou pe LigaProno:
      <strong style="color:${LIGA_PRONO.white};">${escapeHtml(opts.tournamentName)}</strong>.
      Ești deja înscris — nu-ți rămâne decât să pui pronosticurile.
    </p>
    <div style="margin-top:16px;padding:14px 16px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:rgba(255,255,255,0.04);">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${LIGA_PRONO.textSubtle};">
        Competiție
      </p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${LIGA_PRONO.white};">
        ${escapeHtml(opts.competitionLabel)}
      </p>
      ${detailHtml}
    </div>
    ${prizeHtml}
  `;

  const rendered = renderEmailLayout({
    preheader: subject,
    title: "Turneu public nou",
    subtitle: "Ai fost înscris automat. Completează pronosticurile din timp.",
    bodyHtml,
    cta: { label: "Pune pronosticuri", href: opts.ctaHref },
  });

  return { subject, ...rendered };
}
