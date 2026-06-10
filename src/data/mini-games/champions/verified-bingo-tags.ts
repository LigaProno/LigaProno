/**
 * Tag-uri bingo verificate manual — nu se bazează doar pe autoTags.
 * Sursă: rezultate oficiale FIFA / Wikipedia (finale CM).
 */

/** Jucători care au marcat cel puțin un gol în finala CM (timp regulamentar sau prelungiri). */
export const SCORED_FINAL_PLAYER_IDS = new Set([
  "messi",
  "di_maria",
  "mbappe",
  "pogba",
  "griezmann",
  "gotze",
  "iniesta",
  "zidane",
  "petit",
  "ronaldo_nazario",
  "brehme",
  "burruchaga",
  "valdano",
  "brown",
  "materazzi",
  "rossi",
  "tardelli",
  "kempes",
  "carlos_alberto",
  "breitner",
  "muller_gerd",
  "hurst",
  "peters",
  "vava",
  "pele",
  "garrincha",
  "morlock",
  "rahn",
  "ghiggia",
  "schiavio",
  "schiaffino",
  "castro",
]);

/**
 * A evoluat la un CM în aceeași grupă cu România (verificat pe grupele turneului).
 * 1970 Grupa 6: Brazilia, Anglia, Cehoslovacia, România
 * 1990 Grupa B: Argentina, URSS, România, Camerun
 */
export const ROMANIA_GROUP_PLAYER_IDS = new Set([
  "pele",
  "jairzinho",
  "carlos_alberto",
  "tostao",
  "rivellino",
  "felix",
  "everaldo",
  "brito",
  "banks",
  "moore",
  "charlton_bobby",
  "hurst",
  "peters",
  "cohen",
  "stiles",
  "hunt",
  "maradona",
]);

/** Căpitan la CM câștigat (a ridicat trofeul). */
export const CAPTAIN_WC_PLAYER_IDS = new Set([
  "messi",
  "lloris",
  "lahm",
  "casillas",
  "buffon",
  "cafu",
  "beckenbauer",
  "dunga",
  "maradona",
  "zoff",
  "scirea",
  "passarella",
  "moore",
  "carlos_alberto",
  "bellini",
  "nasazzi",
  "deschamps",
  "matthaus",
  "fritz_walter",
  "maspoli",
]);

/** Tag-uri suplimentare per jucător (în plus față de autoTags). */
export const EXTRA_VERIFIED_TAGS: Record<string, string[]> = {};

export function applyVerifiedBingoTags(
  playerId: string,
  baseTags: string[],
): string[] {
  const tags = new Set(baseTags);

  tags.delete("scored_final");
  tags.delete("romania_group");
  tags.delete("captain_wc");

  if (SCORED_FINAL_PLAYER_IDS.has(playerId)) tags.add("scored_final");
  if (ROMANIA_GROUP_PLAYER_IDS.has(playerId)) tags.add("romania_group");
  if (CAPTAIN_WC_PLAYER_IDS.has(playerId)) tags.add("captain_wc");

  for (const t of EXTRA_VERIFIED_TAGS[playerId] ?? []) {
    tags.add(t);
  }

  return [...tags];
}
