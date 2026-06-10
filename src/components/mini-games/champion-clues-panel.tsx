"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { ChampionReveal } from "@/lib/mini-games/champion-clues";

function FlagIcon({ code }: { code: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      alt=""
      width={24}
      height={18}
      className="inline-block rounded-sm shrink-0"
      style={{ imageRendering: "auto" }}
    />
  );
}

export default function ChampionCluesPanel({ reveals }: { reveals: ChampionReveal[] }) {
  const { t } = useLocale();

  if (reveals.length === 0) return null;

  return (
    <ul className="mb-4 space-y-1.5">
      {reveals.map((reveal, i) => {
        if (reveal.type === "country") {
          return (
            <li
              key={`country-${i}`}
              className="text-sm px-3 py-2 rounded-lg flex items-center gap-2.5"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)" }}
            >
              <FlagIcon code={reveal.flagCode} />
              <span>
                {t("miniGames.champion.clueCountry")}: <strong>{reveal.nationality}</strong>
              </span>
            </li>
          );
        }
        if (reveal.type === "wc_years") {
          return (
            <li
              key={`wc-${i}`}
              className="text-sm px-3 py-2 rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.75)" }}
            >
              {t("miniGames.champion.clueWcYears", { years: reveal.years.join(", ") })}
            </li>
          );
        }
        if (reveal.type === "photo_clearer") {
          return (
            <li
              key={`photo-${i}`}
              className="text-sm px-3 py-2 rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.75)" }}
            >
              {t("miniGames.champion.cluePhotoClearer")}
            </li>
          );
        }
        if (reveal.type === "position") {
          return (
            <li
              key={`pos-${i}`}
              className="text-sm px-3 py-2 rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.85)" }}
            >
              {t("miniGames.champion.cluePosition")}: <strong>{reveal.label}</strong>
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}
