import {
  parseStoredCompetition,
  COMPETITION_PICKER_OPTIONS,
  competitionShortLabel,
} from "@/lib/competition";
import {
  fetchCompetitionMatches,
  fetchCompetitionMatchesFresh,
  type FootballDataMatch,
} from "@/lib/football-data";
import { loadMatchesWithCompetitionVenues } from "@/lib/competition-match-venues";
import {
  filterMatchesForTournament,
  type TournamentMatchFilterFields,
} from "@/lib/wc-pred-display";

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

function filterFieldsFromTournament(
  tournament: TournamentCompetitionFields,
): TournamentMatchFilterFields {
  return {
    startMatchday: tournament.startMatchday,
    endMatchday: tournament.endMatchday,
    selectedMatchIds: tournament.selectedMatchIds ?? [],
  };
}

/**
 * Încarcă meciurile din toate competițiile turneului, aplică venue/score overrides
 * per competiție, apoi filtrează pe selectedMatchIds sau fereastră matchday.
 */
export async function loadTournamentMatches(
  tournament: TournamentCompetitionFields,
  options?: { fresh?: boolean; cacheOnly?: boolean },
): Promise<{ matches: FootballDataMatch[]; loadError: string | null }> {
  const keys = resolveTournamentCompetitionKeys(tournament);
  if (keys.length === 0) {
    return { matches: [], loadError: null };
  }

  const fetchFn = options?.fresh
    ? fetchCompetitionMatchesFresh
    : fetchCompetitionMatches;

  try {
    const batches = await Promise.all(
      keys.map(async (key) => {
        const parsed = parseStoredCompetition(key);
        if (!parsed) return [] as FootballDataMatch[];
        let matches = await fetchFn(parsed.code, parsed.season);
        if (matches.length > 0) {
          matches = await loadMatchesWithCompetitionVenues(key, matches, {
            cacheOnly: options?.cacheOnly ?? true,
          });
        }
        return matches.map((m) => ({ ...m, competitionKey: key }));
      }),
    );

    const merged = batches.flat();
    // Dedup pe id (în caz de overlap improbabil)
    const byId = new Map<number, FootballDataMatch>();
    for (const m of merged) byId.set(m.id, m);
    const all = [...byId.values()].sort(
      (a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate),
    );

    return {
      matches: filterMatchesForTournament(all, filterFieldsFromTournament(tournament)),
      loadError: null,
    };
  } catch (e) {
    return {
      matches: [],
      loadError: e instanceof Error ? e.message : "Could not load matches.",
    };
  }
}

/** Fetch brut (fără filter) pe toate cheile — util pentru validare la creare. */
export async function fetchMatchesForCompetitionKeys(
  competitionKeys: string[],
): Promise<FootballDataMatch[]> {
  const unique = [...new Set(competitionKeys.map((k) => k.trim()).filter(Boolean))];
  const batches = await Promise.all(
    unique.map(async (key) => {
      const parsed = parseStoredCompetition(key);
      if (!parsed) return [] as FootballDataMatch[];
      return fetchCompetitionMatches(parsed.code, parsed.season);
    }),
  );
  const byId = new Map<number, FootballDataMatch>();
  for (const m of batches.flat()) byId.set(m.id, m);
  return [...byId.values()];
}
