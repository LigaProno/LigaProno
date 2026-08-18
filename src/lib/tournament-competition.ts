import {
  COMPETITION_PICKER_OPTIONS,
  competitionShortLabel,
} from "@/lib/competition";

export type TournamentCompetitionFields = {
  competition: string | null;
  competitions?: string[];
  selectedMatchIds?: number[];
  startMatchday: number | null;
  endMatchday: number | null;
};

/** Chei COD_an din care se fetch-uiesc meciurile turneului. */
export function resolveTournamentCompetitionKeys(
  tournament: Pick<TournamentCompetitionFields, "competition" | "competitions">,
): string[] {
  const fromList = (tournament.competitions ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  if (fromList.length > 0) {
    return [...new Set(fromList)];
  }
  const single = tournament.competition?.trim();
  return single ? [single] : [];
}

export function isMixedTournament(
  tournament: Pick<TournamentCompetitionFields, "selectedMatchIds">,
): boolean {
  return (tournament.selectedMatchIds?.length ?? 0) > 0;
}

/** Label afișat în listă: Mix / nume campionat. */
export function tournamentCompetitionLabel(
  tournament: Pick<TournamentCompetitionFields, "competition" | "competitions" | "selectedMatchIds">,
): string {
  if (isMixedTournament(tournament)) {
    const keys = resolveTournamentCompetitionKeys(tournament);
    const labels = keys.map((key) => competitionShortLabel(key));
    if (labels.length === 0) return "Mix";
    if (labels.length === 1) return `Mix · ${labels[0]}`;
    if (labels.length === 2) return `Mix · ${labels[0]} + ${labels[1]}`;
    return `Mix · ${labels.length} campionate`;
  }

  const key = tournament.competition?.trim();
  if (!key) return "—";
  const opt = COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === key);
  return opt?.label ?? key;
}

/**
 * Prima cheie de competiție (pentru API-uri care încă cer un singur string,
 * ex. match-insights). Preferă `competition`, altfel prima din `competitions`.
 */
export function primaryTournamentCompetition(
  tournament: Pick<TournamentCompetitionFields, "competition" | "competitions">,
): string | null {
  const keys = resolveTournamentCompetitionKeys(tournament);
  return keys[0] ?? null;
}
