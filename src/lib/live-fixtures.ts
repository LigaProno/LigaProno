import "server-only";

import {
  competitionMayHaveLiveNow,
  fetchCompetitionLiveMatches,
} from "@/lib/football-data";
import type { FootballDataMatch } from "@/lib/football-data-types";
import { parseStoredCompetition } from "@/lib/competition";
import {
  isMatchStaleForScoreFallback,
  loadMatchesWithScoreOverrides,
} from "@/lib/competition-match-scores";
import { formatTeamDisplayName } from "@/lib/team-display";
import { filterMatchesForTournament } from "@/lib/wc-pred-display";
import {
  resolveTournamentCompetitionKeys,
  type TournamentCompetitionFields,
} from "@/lib/tournament-competition";
import type { LiveFixture } from "@/lib/live-fixture-types";

export type { LiveFixture } from "@/lib/live-fixture-types";

function toFixture(m: FootballDataMatch): LiveFixture {
  const ft = m.score?.fullTime;
  return {
    matchId: m.id,
    home: formatTeamDisplayName(m.homeTeam),
    away: formatTeamDisplayName(m.awayTeam),
    homeCrest: m.homeTeam?.crest ?? null,
    awayCrest: m.awayTeam?.crest ?? null,
    homeScore: ft?.home ?? 0,
    awayScore: ft?.away ?? 0,
    status: m.status === "PAUSED" ? "PAUSED" : "IN_PLAY",
  };
}

export function liveFixturesFromMatches(
  matches: FootballDataMatch[],
  tournament: TournamentCompetitionFields,
): LiveFixture[] {
  const inWindow = filterMatchesForTournament(matches, tournament);
  return inWindow
    .filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED")
    .filter((m) => !isMatchStaleForScoreFallback(m))
    .map(toFixture);
}

/**
 * Meciurile în desfășurare din fereastra turneului, gata de afișat.
 * Nu lovește Football-Data dacă snapshot-ul de sezon arată că nu e fereastră live.
 */
export async function loadTournamentLiveFixtures(
  tournament: TournamentCompetitionFields,
): Promise<LiveFixture[]> {
  const keys = resolveTournamentCompetitionKeys(tournament);
  if (keys.length === 0) return [];

  const liveBatches = await Promise.all(
    keys.map(async (key) => {
      const parsed = parseStoredCompetition(key);
      if (!parsed) return [] as FootballDataMatch[];
      try {
        const live = await fetchCompetitionLiveMatches(parsed.code, parsed.season);
        if (live.length === 0) return [] as FootballDataMatch[];
        return await loadMatchesWithScoreOverrides(key, live, { cacheOnly: true });
      } catch {
        return [] as FootballDataMatch[];
      }
    }),
  );

  return liveFixturesFromMatches(liveBatches.flat(), tournament);
}

export { competitionMayHaveLiveNow };
