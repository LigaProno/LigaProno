import type { ChampionPlayer, ChampionPosition } from "@/lib/mini-games/types";

const EUROPE = new Set(["DE", "FR", "IT", "ES", "EN", "GB"]);

const SOUTH_AMERICA = new Set(["AR", "BR", "UY", "CL", "CO"]);

export function wikiPlayerImage(filename: string, width = 320): string {
  const normalized = filename.trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(normalized)}?width=${width}`;
}

function autoTags(
  code: string,
  wcWins: number[],
  position: ChampionPosition,
  extra: string[],
): string[] {
  const tags = new Set(extra);

  if (code === "BR") tags.add("wc_brazil");
  if (code === "AR") tags.add("wc_argentina");
  if (code === "DE") tags.add("wc_germany");
  if (code === "FR") tags.add("wc_france");
  if (code === "IT") tags.add("wc_italy");
  if (code === "ES") tags.add("wc_spain");
  if (code === "EN" || code === "GB") tags.add("wc_england");
  if (code === "UY") tags.add("wc_uruguay");

  if (EUROPE.has(code)) tags.add("europe_winner");
  if (SOUTH_AMERICA.has(code)) tags.add("south_america");

  for (const y of wcWins) tags.add(`wc_${y}`);
  if (wcWins.length >= 2) tags.add("multi_wc");
  if (wcWins.some((y) => y < 1990)) tags.add("pre_1990");
  if (position === "GK") tags.add("gk_winner");
  if (position === "DEF") tags.add("defender_winner");
  if (position === "MID") tags.add("midfielder_winner");
  if (position === "FWD") tags.add("forward_winner");

  return [...tags];
}

export const NAT_NAMES: Record<string, { ro: string; en: string }> = {
  AR: { ro: "Argentina", en: "Argentina" },
  BR: { ro: "Brazilia", en: "Brazil" },
  FR: { ro: "Franța", en: "France" },
  DE: { ro: "Germania", en: "Germany" },
  IT: { ro: "Italia", en: "Italy" },
  ES: { ro: "Spania", en: "Spain" },
  EN: { ro: "Anglia", en: "England" },
  GB: { ro: "Anglia", en: "England" },
  UY: { ro: "Uruguay", en: "Uruguay" },
  NL: { ro: "Olanda", en: "Netherlands" },
};

export function champ(
  id: string,
  name: string,
  code: string,
  position: ChampionPosition,
  wcWins: number[],
  imageFile: string,
  fact: { ro: string; en: string },
  extraTags: string[] = [],
): ChampionPlayer {
  const nat = NAT_NAMES[code] ?? { ro: code, en: code };
  return {
    id,
    name,
    nationality: nat.ro,
    nationalityCode: code,
    position,
    wcWins,
    tags: autoTags(code, wcWins, position, extraTags),
    imageUrl: wikiPlayerImage(imageFile),
    fact,
  };
}
