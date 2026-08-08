import type { FootballDataMatch } from "@/lib/football-data";
import {
  fetchTournamentFixtures,
  type OpScheduleFixture,
} from "@/lib/odds-providers/oddsportal/client";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";
import { mapFixturesToFootballDataMatches } from "@/lib/odds-providers/team-matcher";

export type { OpScheduleFixture };

/** FD pe ligi secundare folosește deseori 17:00Z — lăsăm fereastră mai largă la matching. */
const SCHEDULE_MATCH_MAX_DIFF_HOURS = 48;

export async function fetchCompetitionScheduleFixtures(
  code: string,
  season: string,
): Promise<OpScheduleFixture[]> {
  const config = getOddsPortalCompetition(code, season);
  if (!config) return [];
  return fetchTournamentFixtures(config);
}

function fixtureVenue(
  fixture: OpScheduleFixture,
): FootballDataMatch["venue"] {
  const stadium = fixture.stadium?.trim();
  const locality = [fixture.city, fixture.country].filter(Boolean).join(", ");
  if (!stadium && !locality) return null;
  return {
    name: stadium ?? undefined,
    city: locality || null,
  };
}

export function enrichMatchesWithScrapedSchedule(
  matches: FootballDataMatch[],
  fixtures: OpScheduleFixture[],
): FootballDataMatch[] {
  const byMatchId = mapFixturesToFootballDataMatches(fixtures, matches, {
    maxDiffHours: SCHEDULE_MATCH_MAX_DIFF_HOURS,
  });

  return matches.map((match) => {
    const fixture = byMatchId.get(match.id);
    if (!fixture) return match;

    const venue = fixtureVenue(fixture);
    const utcDate =
      fixture.startDateIso ?
        new Date(fixture.startDateIso).toISOString()
      : match.utcDate;

    return {
      ...match,
      utcDate,
      venue: venue ?? match.venue,
    };
  });
}
