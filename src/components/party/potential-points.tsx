"use client";

import {
  lookup1x2Odd,
  lookupCorrectScoreOdd,
  type MatchOddsRow,
} from "@/lib/betting-odds";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  POINTS_HT_BASE,
  POINTS_FT_BASE,
  POINTS_CORRECT_SCORE_BASE,
  roundPoints,
} from "@/lib/wc-scoring";

const CYAN = "#3B82F6";
const LIME = "#60A5FA";
const MUTED = "rgba(255,255,255,0.45)";

export function PotentialPoints({
  ht,
  ft,
  hg,
  ag,
  matchOdds,
}: {
  ht: string;
  ft: string;
  hg: string;
  ag: string;
  matchOdds: MatchOddsRow | null | undefined;
}) {
  const { t } = useLocale();
  const hasAny = ht || ft || (hg !== "" && ag !== "");
  if (!hasAny) return null;

  const htOdd = ht ? lookup1x2Odd(matchOdds, "ht1x2", ht as "HOME" | "DRAW" | "AWAY") : null;
  const ftOdd = ft ? lookup1x2Odd(matchOdds, "ft1x2", ft as "HOME" | "DRAW" | "AWAY") : null;
  const homeGoals = hg !== "" ? Number(hg) : null;
  const awayGoals = ag !== "" ? Number(ag) : null;
  const csOdd =
    homeGoals != null && awayGoals != null && !isNaN(homeGoals) && !isNaN(awayGoals)
      ? lookupCorrectScoreOdd(matchOdds, homeGoals, awayGoals)
      : null;

  const htPts = htOdd != null ? roundPoints(POINTS_HT_BASE * htOdd) : null;
  const ftPts = ftOdd != null ? roundPoints(POINTS_FT_BASE * ftOdd) : null;
  const csPts = csOdd != null ? roundPoints(POINTS_CORRECT_SCORE_BASE * csOdd) : null;

  const total = roundPoints((htPts ?? 0) + (ftPts ?? 0) + (csPts ?? 0));

  const noOdds = !matchOdds;

  return (
    <div
      className="rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 items-center"
      style={{
        backgroundColor: "rgba(59,130,246,0.06)",
        borderTop: "1px solid rgba(59,130,246,0.12)",
      }}
    >
      {htPts != null && (
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.halfTime")}{" "}
          <span className="text-white font-medium">{ht}</span>
          {!noOdds && <span style={{ color: CYAN }}> ×{htOdd?.toFixed(2)}</span>}
          <span style={{ color: LIME }}> = {htPts} {t("potentialPoints.pointsShort")}</span>
        </span>
      )}
      {ftPts != null && (
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.fullTime")}{" "}
          <span className="text-white font-medium">{ft}</span>
          {!noOdds && <span style={{ color: CYAN }}> ×{ftOdd?.toFixed(2)}</span>}
          <span style={{ color: LIME }}> = {ftPts} {t("potentialPoints.pointsShort")}</span>
        </span>
      )}
      {csPts != null && (
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.score")}{" "}
          <span className="text-white font-medium">{hg}-{ag}</span>
          {!noOdds && <span style={{ color: CYAN }}> ×{csOdd?.toFixed(2)}</span>}
          <span style={{ color: LIME }}> = {csPts} {t("potentialPoints.pointsShort")}</span>
        </span>
      )}
      <span className="text-xs font-bold ml-auto" style={{ color: LIME }}>
        {t("potentialPoints.potentialTotal", { total })}
      </span>
      {noOdds && (
        <span className="text-xs w-full" style={{ color: "rgba(251,146,60,0.7)" }}>
          {t("potentialPoints.oddsUnavailable")}
        </span>
      )}
    </div>
  );
}
