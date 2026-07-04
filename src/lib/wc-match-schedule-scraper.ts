import type { FootballDataMatch } from "@/lib/football-data";
import {
  fetchTournamentFixtures,
  type OpScheduleFixture,
} from "@/lib/odds-providers/oddsportal/client";
import { mapFixturesToFootballDataMatches } from "@/lib/odds-providers/team-matcher";

export type { OpScheduleFixture };

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
  const byMatchId = mapFixturesToFootballDataMatches(fixtures, matches);

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

