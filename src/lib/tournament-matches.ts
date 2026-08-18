import { parseStoredCompetition } from "@/lib/competition";
import {
  fetchCompetitionMatches,
  fetchCompetitionMatchesFresh,
} from "@/lib/football-data";
import type { FootballDataMatch } from "@/lib/football-data-types";
import { loadMatchesWithCompetitionVenues } from "@/lib/competition-match-venues";
import {
  filterMatchesForTournament,
  type TournamentMatchFilterFields,
} from "@/lib/wc-pred-display";
import {
  resolveTournamentCompetitionKeys,
  type TournamentCompetitionFields,
} from "@/lib/tournament-competition";

export type { TournamentCompetitionFields } from "@/lib/tournament-competition";
export {
  isMixedTournament,
  primaryTournamentCompetition,
  resolveTournamentCompetitionKeys,
  tournamentCompetitionLabel,
} from "@/lib/tournament-competition";

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
