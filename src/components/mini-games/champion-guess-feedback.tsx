"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export default function ChampionGuessFeedback({
  countryMatch,
  positionMatch,
  solved,
  failed,
  visible,
}: {
  countryMatch: boolean;
  positionMatch: boolean;
  solved: boolean;
  failed: boolean;
  visible: boolean;
}) {
  const { t } = useLocale();

  if (!visible) return null;

  if (solved) {
    return (
      <p className="text-sm text-center mb-4 font-medium text-emerald-300">
        {t("miniGames.champion.solved")}
      </p>
    );
  }

  if (failed) {
    return (
      <p className="text-sm text-center mb-4 font-medium text-white/55">
        {t("miniGames.champion.failed")}
      </p>
    );
  }

  const hasPartial = countryMatch || positionMatch;

  return (
    <div className="text-sm text-center mb-4 space-y-1">
      <p className="font-medium text-white/55">
        {hasPartial ? t("miniGames.champion.wrongShort") : t("miniGames.champion.wrong")}
      </p>
      {countryMatch && positionMatch ? (
        <p className="font-medium text-emerald-300">{t("miniGames.champion.matchBoth")}</p>
      ) : (
        <>
          {countryMatch && (
            <p className="font-medium text-emerald-300">{t("miniGames.champion.matchCountry")}</p>
          )}
          {positionMatch && (
            <p className="font-medium text-emerald-300">{t("miniGames.champion.matchPosition")}</p>
          )}
        </>
      )}
    </div>
  );
}
