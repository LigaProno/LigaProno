"use client";

import {
  hasDirectHtFtOdd,
  lookupCorrectScoreOdd,
  type MatchOddsRow,
} from "@/lib/betting-odds";
import { useLocale } from "@/components/i18n/locale-provider";
import {
  combineMatchPointsTotal,
  computePotentialPointComponents,
  POINTS_CORRECT_SCORE_BASE,
  POINTS_FT_BASE,
  POINTS_HT_BASE,
  POINTS_HT_FT_COMBO_BASE,
} from "@/lib/wc-scoring";

const CYAN = "#3B82F6";
const LIME = "#60A5FA";
const MUTED = "rgba(255,255,255,0.45)";

function outcomeLabel(val: string): "HOME" | "DRAW" | "AWAY" | null {
  if (val === "HOME" || val === "DRAW" || val === "AWAY") return val;
  return null;
}

export function PotentialPoints({
  ht,
  ft,
  hg,
  ag,
  matchOdds,
  hideOddsUnavailable = false,
}: {
  ht: string;
  ft: string;
  hg: string;
  ag: string;
  matchOdds: MatchOddsRow | null | undefined;
  hideOddsUnavailable?: boolean;
}) {
  const { t } = useLocale();
  const hasAny = ht || ft || (hg !== "" && ag !== "");
  if (!hasAny) return null;

  const homeGoals = hg !== "" ? Number(hg) : null;
  const awayGoals = ag !== "" ? Number(ag) : null;
  const display = computePotentialPointComponents(
    {
      htOutcome: ht || null,
      ftOutcome: ft || null,
      predHomeGoals:
        homeGoals != null && !Number.isNaN(homeGoals) ? homeGoals : null,
      predAwayGoals:
        awayGoals != null && !Number.isNaN(awayGoals) ? awayGoals : null,
    },
    matchOdds,
  );

  const csOdd =
    homeGoals != null &&
    awayGoals != null &&
    !Number.isNaN(homeGoals) &&
    !Number.isNaN(awayGoals) ?
      lookupCorrectScoreOdd(matchOdds, homeGoals, awayGoals)
    : null;

  const total = combineMatchPointsTotal({
    htFt: display.htFtPoints,
    correctScore: display.correctScore,
  });

  const htOutcome = outcomeLabel(ht);
  const ftOutcome = outcomeLabel(ft);
  const usesHtFtMarket =
    display.mode === "combo" &&
    htOutcome != null &&
    ftOutcome != null &&
    hasDirectHtFtOdd(matchOdds, htOutcome, ftOutcome);

  const totalParts = [display.htFtPoints, display.correctScore].filter(
    (v): v is number => v != null,
  );
  const combinedFormula =
    totalParts.length > 1 ? totalParts.map((v) => String(v)).join(" + ") : null;

  const noOdds = !matchOdds;

  return (
    <div
      className="rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1 items-center"
      style={{
        backgroundColor: "rgba(59,130,246,0.06)",
        borderTop: "1px solid rgba(59,130,246,0.12)",
      }}
    >
      {display.mode === "combo" && display.htFtPoints != null && (
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.halfTimeFullTime")}{" "}
          <span className="text-white font-medium">
            {display.htLabel}/{display.ftLabel}
          </span>
          {!noOdds && (
            <span style={{ color: CYAN }}>
              {" "}
              ×{display.htFtOdd?.toFixed(2)}
              {usesHtFtMarket ? ` (${t("potentialPoints.htFtMarket")})` : ""}
            </span>
          )}
          <span style={{ color: LIME }}>
            {" "}
            = {display.htFtPoints} {t("potentialPoints.pointsShort")}
          </span>
        </span>
      )}
      {display.mode === "htOnly" && display.htFtPoints != null && (
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.halfTime")}{" "}
          <span className="text-white font-medium">{display.htLabel}</span>
          {!noOdds && <span style={{ color: CYAN }}> ×{display.htFtOdd?.toFixed(2)}</span>}
          <span style={{ color: LIME }}>
            {" "}
            = {display.htFtPoints} {t("potentialPoints.pointsShort")}
          </span>
        </span>
      )}
      {display.mode === "ftOnly" && display.htFtPoints != null && (
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.fullTime")}{" "}
          <span className="text-white font-medium">{display.ftLabel}</span>
          {!noOdds && <span style={{ color: CYAN }}> ×{display.htFtOdd?.toFixed(2)}</span>}
          <span style={{ color: LIME }}>
            {" "}
            = {display.htFtPoints} {t("potentialPoints.pointsShort")}
          </span>
        </span>
      )}
      {display.correctScore != null && (
        <span className="text-xs" style={{ color: MUTED }}>
          {t("potentialPoints.score")}{" "}
          <span className="text-white font-medium">
            {hg}-{ag}
          </span>
          {!noOdds && csOdd != null && (
            <span style={{ color: CYAN }}> ×{csOdd.toFixed(2)}</span>
          )}
          <span style={{ color: LIME }}>
            {" "}
            = {display.correctScore} {t("potentialPoints.pointsShort")}
          </span>
        </span>
      )}
      <span className="text-xs font-bold ml-auto" style={{ color: LIME }}>
        {combinedFormula ?
          t("potentialPoints.addedTotal", { formula: combinedFormula, total })
        : t("potentialPoints.potentialTotal", { total })}
      </span>
      {noOdds && !hideOddsUnavailable && (
        <span className="text-xs w-full" style={{ color: "rgba(251,146,60,0.7)" }}>
          {t("potentialPoints.oddsUnavailable")}
        </span>
      )}
    </div>
  );
}

export function PointsScoringLegend() {
  const { t } = useLocale();

  return (
    <div
      className="rounded-xl border px-4 py-3 flex flex-col gap-2"
      style={{
        backgroundColor: "rgba(59,130,246,0.05)",
        borderColor: "rgba(59,130,246,0.15)",
      }}
    >
      <p className="text-xs font-semibold text-white">{t("potentialPoints.legendTitle")}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: MUTED }}>
        <span>
          <span className="font-medium text-white">{t("potentialPoints.halfTimeFullTime")}</span>
          {": "}
          <span className="font-bold tabular-nums" style={{ color: CYAN }}>
            {POINTS_HT_FT_COMBO_BASE}
          </span>{" "}
          {t("potentialPoints.baseTimesOdds")}
          {` (${t("potentialPoints.htFtMarketHint")})`}
        </span>
        <span>
          <span className="font-medium text-white">{t("potentialPoints.halfTime")}</span>
          {": "}
          <span className="font-bold tabular-nums" style={{ color: CYAN }}>
            {POINTS_HT_BASE}
          </span>{" "}
          {t("potentialPoints.baseTimesOdds")}
        </span>
        <span>
          <span className="font-medium text-white">{t("potentialPoints.fullTime")}</span>
          {": "}
          <span className="font-bold tabular-nums" style={{ color: CYAN }}>
            {POINTS_FT_BASE}
          </span>{" "}
          {t("potentialPoints.baseTimesOdds")}
        </span>
        <span>
          <span className="font-medium text-white">{t("potentialPoints.score")}</span>
          {": "}
          <span className="font-bold tabular-nums" style={{ color: LIME }}>
            {POINTS_CORRECT_SCORE_BASE}
          </span>{" "}
          {t("potentialPoints.baseTimesOdds")}
          {` — ${t("potentialPoints.scoreIndependent")}`}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
        {t("potentialPoints.legendMultiplyHint")}
      </p>
    </div>
  );
}
