"use client";

import Image from "next/image";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  matchGroupToGroupKey,
  stageDisplayName,
  type FootballDataMatch,
} from "@/lib/football-data";
import { formatMatchKickoff } from "@/lib/match-datetime";
import { matchResultHtFt, teamShort } from "@/lib/wc-pred-display";

function matchPhaseLabel(m: FootballDataMatch): string {
  if (m.stage === "GROUP_STAGE") {
    return matchGroupToGroupKey(m.group) ?? "—";
  }
  if (m.stage) return stageDisplayName(m.stage);
  return "—";
}

function isLiveStatus(status?: string): boolean {
  return status === "IN_PLAY" || status === "PAUSED" || status === "LIVE";
}

export function MatchesChronologicalTable({
  matches,
  mode,
}: {
  matches: FootballDataMatch[];
  mode: "results" | "upcoming";
}) {
  const { t, dateLocale } = useLocale();

  if (matches.length === 0) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "rgba(255,255,255,0.45)" }}>
        {mode === "results" ? t("matches.noResults") : t("matches.noUpcoming")}
      </p>
    );
  }

  return (
    <div
      className="rounded-2xl border overflow-x-auto"
      style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
    >
      <table className="w-full text-xs sm:text-sm min-w-[36rem]">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <th className="text-left py-3 px-3 sm:px-4 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("matches.col.when")}
            </th>
            <th className="text-left py-3 px-2 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("matches.col.match")}
            </th>
            <th className="text-center py-3 px-2 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("party.lb.ht")}
            </th>
            <th className="text-center py-3 px-2 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("party.lb.ft")}
            </th>
            <th className="text-left py-3 px-2 font-semibold hidden sm:table-cell" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("matches.col.phase")}
            </th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const { ht, ft } = matchResultHtFt(m);
            const live = isLiveStatus(m.status);
            const when = formatMatchKickoff(m.utcDate, dateLocale);
            const home = teamShort(m.homeTeam);
            const away = teamShort(m.awayTeam);

            return (
              <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <td className="py-3 px-3 sm:px-4 align-top tabular-nums whitespace-nowrap" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {when}
                  {live ?
                    <span className="ml-1.5 text-[10px] font-bold uppercase" style={{ color: "#F87171" }}>
                      {t("matches.live")}
                    </span>
                  : null}
                </td>
                <td className="py-3 px-2 align-top">
                  <div className="flex items-center gap-2 min-w-0">
                    {m.homeTeam.crest ?
                      <Image src={m.homeTeam.crest} alt="" width={18} height={18} className="shrink-0 object-contain" unoptimized />
                    : null}
                    <span className="font-medium text-white tabular-nums">
                      {home}
                      <span className="mx-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>–</span>
                      {away}
                    </span>
                    {m.awayTeam.crest ?
                      <Image src={m.awayTeam.crest} alt="" width={18} height={18} className="shrink-0 object-contain" unoptimized />
                    : null}
                  </div>
                </td>
                <td className="py-3 px-2 align-top text-center tabular-nums font-semibold text-emerald-200/95">
                  {ht ?? (mode === "upcoming" ? "—" : "—")}
                </td>
                <td className="py-3 px-2 align-top text-center tabular-nums font-semibold" style={{ color: ft ? "#BEF264" : "rgba(255,255,255,0.35)" }}>
                  {ft ?? "—"}
                </td>
                <td className="py-3 px-2 align-top hidden sm:table-cell text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {matchPhaseLabel(m)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
