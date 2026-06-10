import { NAT_NAMES } from "@/data/mini-games/champions/helpers";
import type { Locale } from "@/lib/i18n";
import type { ChampionPlayer } from "./types";

/** Țara + steag după 2 încercări greșite. */
export const CHAMPION_COUNTRY_REVEAL_AFTER = 2;
/** Poziția la încă 3 încercări după țară (2 + 3 = 5). */
export const CHAMPION_POSITION_REVEAL_AFTER =
  CHAMPION_COUNTRY_REVEAL_AFTER + 3;

const POSITION_LABEL: Record<ChampionPlayer["position"], Record<Locale, string>> = {
  GK: { ro: "Portar", en: "Goalkeeper" },
  DEF: { ro: "Fundaș", en: "Defender" },
  MID: { ro: "Mijlocaș", en: "Midfielder" },
  FWD: { ro: "Atacant", en: "Forward" },
};

export type ChampionReveal =
  | { type: "country"; nationality: string; flagCode: string }
  | { type: "wc_years"; years: number[] }
  | { type: "photo_clearer" }
  | { type: "position"; label: string };

export function flagCodeForNationality(code: string): string {
  const c = code.toUpperCase();
  if (c === "EN" || c === "GB") return "gb";
  return c.toLowerCase();
}

export function normalizeNationalityCode(code: string): string {
  return flagCodeForNationality(code);
}

export function championRevealsForAttempts(
  player: ChampionPlayer,
  attempts: number,
  locale: Locale,
): ChampionReveal[] {
  const reveals: ChampionReveal[] = [];

  if (attempts >= CHAMPION_COUNTRY_REVEAL_AFTER) {
    const nat =
      NAT_NAMES[player.nationalityCode] ?? {
        ro: player.nationality,
        en: player.nationality,
      };
    reveals.push({
      type: "country",
      nationality: nat[locale],
      flagCode: flagCodeForNationality(player.nationalityCode),
    });
  }

  if (attempts >= 3) {
    reveals.push({ type: "wc_years", years: player.wcWins });
  }

  if (attempts >= 4) {
    reveals.push({ type: "photo_clearer" });
  }

  if (attempts >= CHAMPION_POSITION_REVEAL_AFTER) {
    reveals.push({
      type: "position",
      label: POSITION_LABEL[player.position][locale],
    });
  }

  return reveals;
}

export function compareChampionGuess(
  guessed: ChampionPlayer | null,
  target: ChampionPlayer,
): { countryMatch: boolean; positionMatch: boolean } {
  if (!guessed) {
    return { countryMatch: false, positionMatch: false };
  }
  return {
    countryMatch:
      normalizeNationalityCode(guessed.nationalityCode) ===
      normalizeNationalityCode(target.nationalityCode),
    positionMatch: guessed.position === target.position,
  };
}
