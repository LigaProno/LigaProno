"use client";

import Image from "next/image";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatMatchKickoff } from "@/lib/match-datetime";
import type { MatchPredDisplay } from "@/lib/wc-pred-display";

export type NextThreeTeamSide = {
  name: string;
  shortName?: string;
  crest?: string;
};

export type NextThreeMatchPreds = {
  matchId: number;
  utcDate: string;
  homeTeam: NextThreeTeamSide;
  awayTeam: NextThreeTeamSide;
  venue?: string | null;
  ftOdds?: { home: number; draw: number; away: number } | null;
  rows: { userId: string; displayName: string; pred: MatchPredDisplay }[];
};

function MatchPredictionsTable({
  block,
  currentUserId,
  dateLocale,
  stadiumTbd,
  romaniaTimeSuffix,
  labelMember,
  labelHt,
  labelFt,
  labelScore,
  labelAdvancing,
}: {
  block: NextThreeMatchPreds;
  currentUserId: string;
  dateLocale: string;
  stadiumTbd: string;
  romaniaTimeSuffix: string;
  labelMember: string;
  labelHt: string;
  labelFt: string;
  labelScore: string;
  labelAdvancing: string;
}) {
  const when = formatMatchKickoff(block.utcDate, dateLocale);
  const venue = block.venue ?? stadiumTbd;
  const homeLabel = block.homeTeam.shortName ?? block.homeTeam.name;
  const awayLabel = block.awayTeam.shortName ?? block.awayTeam.name;
  const showAdvancing = block.rows.some((row) => row.pred.advancing != null);

  return (
    <article
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
    >
      <div
        className="px-4 py-4 sm:px-5 sm:py-4 flex flex-wrap items-center gap-x-5 gap-y-2"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(15,23,42,0.55)",
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {block.homeTeam.crest ?
            <Image src={block.homeTeam.crest} alt="" width={28} height={28} className="rounded-lg bg-white/90 p-0.5 object-contain shrink-0" unoptimized />
          : null}
          <span className="font-bold text-white text-base sm:text-lg">{homeLabel}</span>
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>vs</span>
          <span className="font-bold text-white text-base sm:text-lg">{awayLabel}</span>
          {block.awayTeam.crest ?
            <Image src={block.awayTeam.crest} alt="" width={28} height={28} className="rounded-lg bg-white/90 p-0.5 object-contain shrink-0" unoptimized />
          : null}
        </div>
        <div className="text-sm tabular-nums font-medium" style={{ color: "#67E8F9" }}>
          {when}
          <span className="ml-1.5 text-xs" style={{ color: "#BEF264" }}>{romaniaTimeSuffix}</span>
        </div>
        <div className="text-xs sm:text-sm truncate max-w-full sm:max-w-xs" style={{ color: "rgba(255,255,255,0.42)" }}>
          {venue}
        </div>
        {block.ftOdds ?
          <div className="text-[11px] sm:text-xs tabular-nums font-medium w-full sm:w-auto" style={{ color: "rgba(167,243,208,0.85)" }}>
            1 {block.ftOdds.home.toFixed(2)} · X {block.ftOdds.draw.toFixed(2)} · 2 {block.ftOdds.away.toFixed(2)}
          </div>
        : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm min-w-[28rem]">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              <th className="text-left py-3 px-3 sm:px-4 text-sm sm:text-base font-bold min-w-[6rem]" style={{ color: "rgba(255,255,255,0.65)" }}>
                {labelMember}
              </th>
              <th className="text-center py-3 px-2 text-sm sm:text-base font-bold w-14" style={{ color: "rgba(255,255,255,0.65)" }}>
                {labelHt}
              </th>
              <th className="text-center py-3 px-2 text-sm sm:text-base font-bold w-14" style={{ color: "rgba(255,255,255,0.65)" }}>
                {labelFt}
              </th>
              <th className="text-center py-3 px-2 text-sm sm:text-base font-bold w-16" style={{ color: "rgba(255,255,255,0.65)" }}>
                {labelScore}
              </th>
              {showAdvancing ?
                <th className="text-center py-3 px-2 text-sm sm:text-base font-bold w-16" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {labelAdvancing}
                </th>
              : null}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr
                key={row.userId}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  backgroundColor:
                    row.userId === currentUserId ? "rgba(34,211,238,0.06)" : undefined,
                }}
              >
                <td
                  className="py-2.5 px-3 sm:px-4 align-middle font-medium truncate max-w-[10rem]"
                  style={{
                    color: row.userId === currentUserId ? "#22D3EE" : "rgba(255,255,255,0.88)",
                  }}
                  title={row.displayName}
                >
                  {row.displayName}
                </td>
                <td className="py-2.5 px-2 align-middle text-center tabular-nums font-medium text-white">
                  {row.pred.ht}
                </td>
                <td className="py-2.5 px-2 align-middle text-center tabular-nums font-medium text-white">
                  {row.pred.ft}
                </td>
                <td className="py-2.5 px-2 align-middle text-center tabular-nums font-semibold text-white">
                  {row.pred.score}
                </td>
                {showAdvancing ?
                  <td className="py-2.5 px-2 align-middle text-center tabular-nums font-medium text-white">
                    {row.pred.advancing ?? "—"}
                  </td>
                : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function NextThreePredictionsPanel({
  matches,
  currentUserId,
  hideTitle = false,
}: {
  matches: NextThreeMatchPreds[];
  currentUserId: string;
  hideTitle?: boolean;
}) {
  const { t, dateLocale } = useLocale();

  if (matches.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      {!hideTitle ?
        <h3 className="text-white font-semibold text-base sm:text-lg px-0.5">
          {t("party.nextThree.title")}
        </h3>
      : null}
      <div className="flex flex-col gap-4">
        {matches.map((block) => (
          <MatchPredictionsTable
            key={block.matchId}
            block={block}
            currentUserId={currentUserId}
            dateLocale={dateLocale}
            stadiumTbd={t("matches.stadiumTbd")}
            romaniaTimeSuffix={t("matches.romaniaTimeSuffix")}
            labelMember={t("party.nextThree.member")}
            labelHt={t("party.lb.predHt")}
            labelFt={t("party.lb.predFt")}
            labelScore={t("party.lb.predSc")}
            labelAdvancing={t("party.lb.predAdv")}
          />
        ))}
      </div>
    </section>
  );
}
