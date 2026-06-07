"use client";

import {
  lookupTeamOutrightOdd,
  lookupTeamQualifyOdd,
  payloadToOddsMaps,
  type TeamOddsRow,
} from "@/lib/betting-odds";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  POINTS_CHAMPION_BASE,
  POINTS_QUALIFIER_TEAM_BASE,
  computePotentialChampionPoints,
  computePotentialQualifierPoints,
  roundPoints,
} from "@/lib/wc-scoring";

const CYAN = "#22D3EE";
const LIME = "#BEF264";
const MUTED = "rgba(255,255,255,0.45)";

function buildTeamOddsMaps(
  teams: Record<string, TeamOddsRow>,
): ReturnType<typeof payloadToOddsMaps> {
  return payloadToOddsMaps({ schemaVersion: 1, matches: {}, teams });
}

export function ChampionPotentialPoints({
  championTeamId,
  bettingOddsByTeamId = {},
}: {
  championTeamId: number | null;
  bettingOddsByTeamId?: Record<string, TeamOddsRow>;
}) {
  const { t } = useLocale();
  if (championTeamId == null) return null;

  const oddsMaps = buildTeamOddsMaps(bettingOddsByTeamId);
  const odd = oddsMaps ? lookupTeamOutrightOdd(oddsMaps, championTeamId) : 1;
  const pts = computePotentialChampionPoints(championTeamId, oddsMaps);
  if (pts == null) return null;

  const noOdds = !bettingOddsByTeamId[String(championTeamId)]?.outrightWinner;

  return (
    <div
      className="rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 items-center"
      style={{
        backgroundColor: "rgba(251,191,36,0.08)",
        borderTop: "1px solid rgba(251,191,36,0.2)",
      }}
    >
      <span className="text-xs" style={{ color: MUTED }}>
        {t("potentialPoints.champion")}
        {!noOdds && (
          <span style={{ color: CYAN }}>
            {" "}
            ×{odd.toFixed(2)} ({POINTS_CHAMPION_BASE} {t("potentialPoints.baseUnit")})
          </span>
        )}
        <span style={{ color: LIME }}> = {pts} {t("potentialPoints.pointsShort")}</span>
      </span>
      <span className="text-xs font-bold ml-auto" style={{ color: LIME }}>
        {t("potentialPoints.potentialTotal", { total: pts })}
      </span>
      {noOdds && (
        <span className="text-xs w-full" style={{ color: "rgba(251,146,60,0.7)" }}>
          {t("potentialPoints.championOddsUnavailable")}
        </span>
      )}
    </div>
  );
}

export function QualifiersPotentialPoints({
  advancingTeamIds,
  bettingOddsByTeamId = {},
  teamLabels = {},
}: {
  advancingTeamIds: number[];
  bettingOddsByTeamId?: Record<string, TeamOddsRow>;
  teamLabels?: Record<number, string>;
}) {
  const { t } = useLocale();
  if (advancingTeamIds.length === 0) return null;

  const oddsMaps = buildTeamOddsMaps(bettingOddsByTeamId);
  const pts = computePotentialQualifierPoints(advancingTeamIds, oddsMaps);
  if (pts == null) return null;

  const uniqueIds = [...new Set(advancingTeamIds)];
  const hasAnyOdds = uniqueIds.some(
    (id) => bettingOddsByTeamId[String(id)]?.toQualifyFromGroup != null,
  );

  return (
    <div
      className="rounded-lg px-3 py-2 flex flex-col gap-2"
      style={{
        backgroundColor: "rgba(34,211,238,0.06)",
        borderTop: "1px solid rgba(34,211,238,0.12)",
      }}
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.qualifiersLine", {
            count: uniqueIds.length,
            base: POINTS_QUALIFIER_TEAM_BASE,
            pts,
          })}
        </span>
        <span className="text-xs font-bold ml-auto" style={{ color: LIME }}>
          {t("potentialPoints.ifAllQualify", { pts })}
        </span>
      </div>
      {hasAnyOdds && (
        <div className="flex flex-wrap gap-2">
          {uniqueIds.map((id) => {
            const odd = oddsMaps ? lookupTeamQualifyOdd(oddsMaps, id) : 1;
            const teamPts = roundPoints(POINTS_QUALIFIER_TEAM_BASE * odd);
            const hasOdd = bettingOddsByTeamId[String(id)]?.toQualifyFromGroup != null;
            const label = teamLabels[id] ?? `#${id}`;
            return (
              <span key={id} className="text-[11px]" style={{ color: MUTED }}>
                {label}
                {hasOdd && <span style={{ color: CYAN }}> ×{odd.toFixed(2)}</span>}
                <span style={{ color: LIME }}> = {teamPts}</span>
              </span>
            );
          })}
        </div>
      )}
      {!hasAnyOdds && (
        <span className="text-xs" style={{ color: "rgba(251,146,60,0.7)" }}>
          {t("potentialPoints.qualifierOddsUnavailable")}
        </span>
      )}
    </div>
  );
}
