export type OddsPortalCompetitionConfig = {
  tournamentPageUrl: string;
  tournamentSlug: string;
  outrightsPageUrl: string;
  tournamentNumericId: number;
  tournamentUuid: string;
};

function config(
  basePath: string,
  slug: string,
  tournamentNumericId: number,
  tournamentUuid: string,
): OddsPortalCompetitionConfig {
  const tournamentPageUrl = `https://www.oddsportal.com${basePath}`;
  return {
    tournamentPageUrl,
    tournamentSlug: slug,
    outrightsPageUrl: `${tournamentPageUrl}outrights/`,
    tournamentNumericId,
    tournamentUuid,
  };
}

/** Sezon 2026/27 — chei Football-Data `{code}_2026`. */
const ODDSPORTAL_BY_CODE: Record<string, OddsPortalCompetitionConfig> = {
  PL: config("/football/england/premier-league/", "premier-league", 113053, "SY30SsKF"),
  PD: config("/football/spain/laliga/", "laliga", 112799, "QeI1Oeyi"),
  FL1: config("/football/france/ligue-1/", "ligue-1", 114453, "0Mp0HlJb"),
  BL1: config("/football/germany/bundesliga/", "bundesliga", 113669, "KY7LrA6d"),
  SA: config("/football/italy/serie-a/", "serie-a", 114199, "WdNk9YwP"),
  RL1: config("/football/romania/superliga/", "superliga", 113405, "WlHrWlWA"),
};

/** Mapare cod competiție Football-Data → config OddsPortal. */
export function getOddsPortalCompetition(
  code: string,
  season: string,
): OddsPortalCompetitionConfig | null {
  const c = code.toUpperCase();
  const s = season.trim();
  if (s !== "2026") return null;
  return ODDSPORTAL_BY_CODE[c] ?? null;
}

export function buildShortMatchPageUrl(
  config: OddsPortalCompetitionConfig,
  matchId: string,
): string {
  return `${config.tournamentPageUrl}unknown-unknown-${matchId}/`;
}

/** Aliasuri nume echipă: Football-Data / variante → OddsPortal normalizat. */
export const TEAM_NAME_ALIASES: Record<string, string> = {
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "korea, republic of": "south korea",
  usa: "united states",
  "united states of america": "united states",
  "bosnia and herzegovina": "bosnia & herzegovina",
  "bosnia-herzegovina": "bosnia & herzegovina",
  "côte d'ivoire": "ivory coast",
  "cote d'ivoire": "ivory coast",
  czechia: "czech republic",
  "dr congo": "dr congo",
  "d r congo": "dr congo",
  "democratic republic of the congo": "dr congo",
  "congo dr": "dr congo",
  curacao: "curaçao",
  "ir iran": "iran",
  "iran ir": "iran",
  "cape verde islands": "cape verde",
  fcsb: "fcsb",
  "fcsb bucuresti": "fcsb",
  "fcsb bucharest": "fcsb",
  "fcsb bukarest": "fcsb",
  "steaua bucuresti": "fcsb",
  "steaua bucharest": "fcsb",
  "cfr cluj": "cf r cluj",
  "fc botosani": "fc botosani",
  botosani: "fc botosani",
  "fc arges pitesti": "arges pitesti",
  "fc argeș pitesti": "arges pitesti",
  argeș: "arges pitesti",
  argeş: "arges pitesti",
  "fc voluntari": "fc voluntari",
  voluntari: "fc voluntari",
  "fc dinamo bucuresti": "dinamo bucuresti",
  "dinamo bucureşti": "dinamo bucuresti",
  "dinamo bucurești": "dinamo bucuresti",
  "universitatea cluj": "u cluj",
  "u cluj napoca": "u cluj",
  "cs universitatea craiova": "u craiova",
  "universitatea craiova": "u craiova",
  "fc universitatea cluj": "u cluj",
  "fc hermannstadt": "hermannstadt",
  hermannstadt: "hermannstadt",
  "fc petrolul ploiesti": "petrolul",
  petrolul: "petrolul",
  "fc farul constanta": "farul constanta",
  "farul constanța": "farul constanta",
  "uta arad": "uta arad",
  "fc uta arad": "uta arad",
  "csikszereda miercurea ciuc": "csikszereda",
  csikszereda: "csikszereda",
  "fc metaloglobus bucuresti": "metaloglobus",
  metaloglobus: "metaloglobus",
  "fc otelul galati": "otelul galati",
  otelul: "otelul galati",
  "unirea slobozia": "unirea slobozia",
  "türkiye": "turkey",
  "korea dpr": "north korea",
  "dpr korea": "north korea",
};
