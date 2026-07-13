"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import type { FootballDataMatch } from "@/lib/football-data";
import { formatMatchKickoff } from "@/lib/match-datetime";
import {
  formatPredFt1x2Part,
  formatPredHtPart,
  formatPredScorePart,
  matchResultHtFt,
  teamShort,
} from "@/lib/wc-pred-display";
import { computeMatchPredictionHits, type MatchPredictionInput } from "@/lib/wc-scoring";

type Row = { match: FootballDataMatch; pred: MatchPredictionInput };

const HIT_COLOR = "#86EFAC";
const DEFAULT_PRED_COLOR = "rgba(255,255,255,0.92)";

function predCellStyle(correct: boolean) {
  return {
    color: correct ? HIT_COLOR : DEFAULT_PRED_COLOR,
    backgroundColor: correct ? "rgba(34,197,94,0.08)" : undefined,
  };
}

export default function MemberPredictionsView({
  tournamentId,
  tournamentName,
  memberDisplayName,
  rows,
  loadError,
  backHref,
  backLabelKey = "memberPred.back",
}: {
  tournamentId: string;
  tournamentName: string;
  memberDisplayName: string;
  rows: Row[];
  loadError: string | null;
  backHref?: string;
  backLabelKey?: "memberPred.back" | "memberPred.backGlobal";
}) {
  const { t, dateLocale } = useLocale();

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <Link
        href={backHref ?? `/turnee/${tournamentId}`}
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t(backLabelKey)}
      </Link>

      {loadError && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm text-red-300"
          style={{
            borderColor: "rgba(248,113,113,0.35)",
            backgroundColor: "rgba(127,29,29,0.25)",
          }}
        >
          {loadError} {t("memberPred.loadErrorSuffix")}
        </div>
      )}

      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {tournamentName}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{memberDisplayName}</h1>
        <p className="text-xs sm:text-sm mt-3 leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.38)" }}>
          {t("memberPred.legend")}
        </p>
      </header>

      {rows.length === 0 ?
        <div
          className="rounded-2xl border px-6 py-12 text-center text-sm"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
        >
          {t("memberPred.empty")}
        </div>
      : <div
          className="rounded-2xl border overflow-x-auto"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.08)" }}
        >
          <table className="w-full text-xs sm:text-sm min-w-[32rem]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {t("memberPred.when")}
                </th>
                <th className="text-left py-3 px-2 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {t("memberPred.match")}
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title={t("memberPred.predHtTip")}
                >
                  {t("party.lb.predHt")}
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title={t("memberPred.predFtTip")}
                >
                  {t("party.lb.predFt")}
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title={t("memberPred.predScTip")}
                >
                  {t("party.lb.predSc")}
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title={t("memberPred.actualHtTip")}
                >
                  {t("party.lb.ht")}
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title={t("memberPred.actualFtTip")}
                >
                  {t("party.lb.ft")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ match: m, pred }) => {
                const { ht: resHt, ft: resFt } = matchResultHtFt(m);
                const hits = computeMatchPredictionHits(pred, m);
                const when = formatMatchKickoff(m.utcDate, dateLocale);
                const fx = `${teamShort(m.homeTeam)}–${teamShort(m.awayTeam)}`;
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td className="py-3 px-3 sm:px-4 align-top tabular-nums whitespace-nowrap" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {when}
                    </td>
                    <td className="py-3 px-2 align-top font-medium text-cyan-200/90">{fx}</td>
                    <td
                      className="py-3 px-2 align-top text-center tabular-nums font-medium"
                      style={predCellStyle(hits.htCorrect)}
                    >
                      {formatPredHtPart(pred)}
                    </td>
                    <td
                      className="py-3 px-2 align-top text-center tabular-nums font-medium"
                      style={predCellStyle(hits.ftCorrect)}
                    >
                      {formatPredFt1x2Part(pred)}
                    </td>
                    <td
                      className="py-3 px-2 align-top text-center tabular-nums font-medium"
                      style={predCellStyle(hits.scoreCorrect)}
                    >
                      {formatPredScorePart(pred)}
                    </td>
                    <td className="py-3 px-2 align-top text-center tabular-nums font-semibold text-emerald-200/95">
                      {resHt ?? "—"}
                    </td>
                    <td className="py-3 px-2 align-top text-center tabular-nums font-semibold text-emerald-200/95">
                      {resFt ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}
