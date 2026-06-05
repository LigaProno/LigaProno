export type OddsPortalCompetitionConfig = {
  tournamentPageUrl: string;
  tournamentSlug: string;
  outrightsPageUrl: string;
  tournamentNumericId: number;
  tournamentUuid: string;
};

const WC_2026: OddsPortalCompetitionConfig = {
  tournamentPageUrl: "https://www.oddsportal.com/football/world/world-championship-2026/",
  tournamentSlug: "world-championship-2026",
  outrightsPageUrl:
    "https://www.oddsportal.com/football/world/world-championship-2026/outrights/",
  tournamentNumericId: 77311,
  tournamentUuid: "zeSHfCx3",
};

/** Mapare cod competiție Football-Data → config OddsPortal. */
export function getOddsPortalCompetition(
  code: string,
  season: string,
): OddsPortalCompetitionConfig | null {
  const c = code.toUpperCase();
  const s = season.trim();
  if (c === "WC" && s === "2026") return WC_2026;
  return null;
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
  "dr congo": "d.r. congo",
  "democratic republic of the congo": "d.r. congo",
  "congo dr": "d.r. congo",
  curacao: "curaçao",
};
