import {
  WC_COMPETITION_CODE,
  WC_SEASON_YEAR,
  type FootballDataMatch,
} from "@/lib/football-data";
import {
  fetchTournamentFixtures,
  type OpScheduleFixture,
} from "@/lib/odds-providers/oddsportal/client";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";
import { mapFixturesToFootballDataMatches } from "@/lib/odds-providers/team-matcher";

export type { OpScheduleFixture };

export async function fetchWc2026ScheduleFixtures(): Promise<OpScheduleFixture[]> {
  const config = getOddsPortalCompetition(
    WC_COMPETITION_CODE,
    String(WC_SEASON_YEAR),
  );
  if (!config) {
    throw new Error("Config OddsPortal lipsă pentru CM 2026.");
  }
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

/** @deprecated Folosește loadMatchesWithCompetitionVenues (cache DB, un singur scrape). */
export async function enrichWorldCupMatchesWithSchedule(
  matches: FootballDataMatch[],
): Promise<FootballDataMatch[]> {
  const { COMPETITION_WC_2026 } = await import("@/lib/competition");
  const { loadMatchesWithCompetitionVenues } = await import(
    "@/lib/competition-match-venues"
  );
  return loadMatchesWithCompetitionVenues(COMPETITION_WC_2026, matches);
}
