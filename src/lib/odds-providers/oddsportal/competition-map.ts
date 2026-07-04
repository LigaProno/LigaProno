export type OddsPortalCompetitionConfig = {
  tournamentPageUrl: string;
  tournamentSlug: string;
  outrightsPageUrl: string;
  tournamentNumericId: number;
  tournamentUuid: string;
};

/** Mapare cod competiție Football-Data → config OddsPortal. */
export function getOddsPortalCompetition(
  _code: string,
  _season: string,
): OddsPortalCompetitionConfig | null {
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
  "dr congo": "dr congo",
  "d r congo": "dr congo",
  "democratic republic of the congo": "dr congo",
  "congo dr": "dr congo",
  curacao: "curaçao",
  "ir iran": "iran",
  "iran ir": "iran",
  "cape verde islands": "cape verde",
  turkiye: "turkey",
  "türkiye": "turkey",
  "korea dpr": "north korea",
  "dpr korea": "north korea",
};
