import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";

/** Campionate de club disponibile pentru echipa favorită (fără CM, EURO, UCL). */
export const FAVORITE_TEAM_COMPETITION_OPTIONS = COMPETITION_PICKER_OPTIONS;

export const DEFAULT_FAVORITE_TEAM_COMPETITION = COMPETITION_PICKER_OPTIONS[0].storageKey;

export function isFavoriteTeamCompetition(storageKey: string): boolean {
  return FAVORITE_TEAM_COMPETITION_OPTIONS.some((o) => o.storageKey === storageKey);
}
