import {
  escapeHtml,
  renderDataTable,
  renderEmailLayout,
} from "@/lib/email/templates/layout";
import { LIGA_PRONO } from "@/lib/auth-brand";

export type RankingRow = {
  rank: number;
  displayName: string;
  total: number;
  isYou?: boolean;
};

export function renderStageRankingEmail(opts: {
  firstName: string | null;
  tournamentName: string;
  mode: "stage" | "final";
  matchday?: number | null;
  yourRank: number;
  yourTotal: number;
  rows: RankingRow[];
  ctaHref: string;
}): { subject: string; html: string; text: string } {
  const name = opts.firstName?.trim() || "acolo";
  const isFinal = opts.mode === "final";
  const stageLabel =
    opts.matchday != null ? `Etapa ${opts.matchday}` : "Etapa";
  const subject = isFinal
    ? `Clasament final — ${opts.tournamentName}: locul #${opts.yourRank}`
    : `Clasament ${stageLabel} — locul tău: #${opts.yourRank}`;

  const title = isFinal ? "Clasament final" : `Clasament ${stageLabel}`;
  const subtitle = isFinal
    ? `${opts.tournamentName} s-a încheiat. Iată podiumul și poziția ta.`
    : `Actualizare după ce s-a încheiat ${stageLabel.toLowerCase()} în ${opts.tournamentName}.`;

  const rows = opts.rows.map((r) => {
    const who = r.isYou
      ? `<strong style="color:#BEF264;">${escapeHtml(r.displayName)} (tu)</strong>`
      : escapeHtml(r.displayName);
    const pts = Number.isInteger(r.total) ? String(r.total) : r.total.toFixed(2);
    return [`#${r.rank}`, who, escapeHtml(pts)];
  });

  const yourPts = Number.isInteger(opts.yourTotal)
    ? String(opts.yourTotal)
    : opts.yourTotal.toFixed(2);

  const bodyHtml = `
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Salut ${escapeHtml(name)},
    </p>
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:${LIGA_PRONO.textMuted};">
      Ești pe locul
      <strong style="color:#BEF264;">#${opts.yourRank}</strong>
      cu
      <strong style="color:${LIGA_PRONO.white};">${escapeHtml(yourPts)} puncte</strong>
      în
      <strong style="color:${LIGA_PRONO.white};">${escapeHtml(opts.tournamentName)}</strong>.
    </p>
    ${renderDataTable(["Loc", "Jucător", "Puncte"], rows)}
  `;

  const rendered = renderEmailLayout({
    preheader: subject,
    title,
    subtitle,
    bodyHtml,
    cta: {
      label: isFinal ? "Vezi turneul" : "Vezi clasamentul complet",
      href: opts.ctaHref,
    },
  });

  return { subject, ...rendered };
}
