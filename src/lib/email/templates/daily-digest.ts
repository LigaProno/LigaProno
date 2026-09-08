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

export type DigestTournamentStatus = {
  tournamentName: string;
  rank: number;
  memberCount: number;
  totalPoints: number;
  dayPoints: number;
};

function formatPts(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function signedPts(n: number): string {
  const abs = formatPts(Math.abs(n));
  if (n > 0) return `+${abs}`;
  if (n < 0) return `−${abs}`;
  return abs;
}

function renderTournamentStatus(t: DigestTournamentStatus): string {
  const day = signedPts(t.dayPoints);
  const total = formatPts(t.totalPoints);
  return `
    <div style="margin-top:16px;padding:14px 16px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:rgba(255,255,255,0.04);">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${LIGA_PRONO.white};">
        ${escapeHtml(t.tournamentName)}
      </p>
      <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${LIGA_PRONO.textMuted};">
        Locul
        <strong style="color:#BEF264;">#${t.rank}</strong>
        din ${t.memberCount}
        ·
        <strong style="color:${LIGA_PRONO.white};">${escapeHtml(total)}</strong> puncte în total
        ·
        <strong style="color:#BEF264;">${escapeHtml(day)}</strong> ieri
      </p>
    </div>`;
}

export function renderDailyDigestEmail(opts: {
  firstName: string | null;
  dateLabel: string;
  totalPoints: number;
  matches: DigestMatchRow[];
  ctaHref: string;
  tournaments?: DigestTournamentStatus[];
}): { subject: string; html: string; text: string } {
  const name = opts.firstName?.trim() || "acolo";
  const pts = formatPts(opts.totalPoints);
  const subject = `Rezumatul zilei: ${pts} puncte`;

  const rows = opts.matches.map((m) => [
    `<div style="font-weight:600;">${escapeHtml(m.fixture)}</div><div style="font-size:11px;color:${LIGA_PRONO.textSubtle};margin-top:2px;">${escapeHtml(m.tournamentName)}</div>`,
    escapeHtml(m.prediction),
    escapeHtml(m.result),
    escapeHtml(m.points),
  ]);

  const statusHtml =
    opts.tournaments && opts.tournaments.length > 0
      ? opts.tournaments.map(renderTournamentStatus).join("")
      : "";

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Iată statusul zilei din
      <strong style="color:${LIGA_PRONO.white};">${escapeHtml(opts.dateLabel)}</strong>
      — clasamentul din turneele tale și meciurile jucate.
      Ai acumulat
      <strong style="color:#BEF264;">${escapeHtml(pts)} puncte</strong>.
    </p>
    ${statusHtml}
    ${renderDataTable(["Meci", "Pronostic", "Rezultat", "Puncte"], rows)}
  `;

  const rendered = renderEmailLayout({
    preheader: `${pts} puncte din ziua ${opts.dateLabel}`,
    title: "Rezumatul zilei",
    subtitle: "Clasamentul tău, predicțiile, scorurile reale și punctele câștigate.",
    bodyHtml,
    cta: { label: "Vezi clasamentul", href: opts.ctaHref },
  });

  return { subject, ...rendered };
}
