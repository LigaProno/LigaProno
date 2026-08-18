import { fetchCompetitionMatches } from "@/lib/football-data";
import type { FootballDataMatch } from "@/lib/football-data-types";
import { getMatchScoreAfter90 } from "@/lib/match-score";
import {
  getHeadToHeadMatches,
  getTeamRecentMatches,
  type FormResult,
  type H2HRow,
  type RecentMatchRow,
} from "@/lib/match-insights";

export type MatchInsightsPayload = {
  homeForm: FormResult[];
  awayForm: FormResult[];
  homeRecent: RecentMatchRow[];
  awayRecent: RecentMatchRow[];
  h2h: H2HRow[];
  h2hSummary: { homeWins: number; awayWins: number; draws: number } | null;
  sources: {
    homeRecent: "api" | "competition" | "mixed";
    awayRecent: "api" | "competition" | "mixed";
    h2h: "api" | "competition" | "mixed";
  };
};

function h2hSummaryFromMatches(
  homeId: number,
  awayId: number,
  matches: FootballDataMatch[],
): MatchInsightsPayload["h2hSummary"] {
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  let any = false;
  for (const m of matches) {
    if (m.status !== "FINISHED" && m.status !== "AWARDED") continue;
    const pair =
      (m.homeTeam.id === homeId && m.awayTeam.id === awayId) ||
      (m.homeTeam.id === awayId && m.awayTeam.id === homeId);
    if (!pair) continue;
    const score = getMatchScoreAfter90(m);
    if (!score || score.home == null || score.away == null) continue;
    any = true;
    if (score.home === score.away) draws += 1;
    else if (m.homeTeam.id === homeId ? score.home > score.away : score.away > score.home) {
      homeWins += 1;
    } else {
      awayWins += 1;
    }
  }
  return any ? { homeWins, awayWins, draws } : null;
}

/**
 * Insights din snapshot-ul de competiție (fără /teams/.../matches și /head2head).
 * Evită 3 request-uri extra la Football-Data per click.
 */
export async function loadMatchInsights(input: {
  matchId: number;
  homeId: number;
  awayId: number;
  competitionCode?: string | null;
  competitionSeason?: string | null;
}): Promise<MatchInsightsPayload> {
  const limit = 5;

  let competitionMatches: FootballDataMatch[] = [];
  if (input.competitionCode && input.competitionSeason) {
    try {
      competitionMatches = await fetchCompetitionMatches(
        input.competitionCode,
        input.competitionSeason,
      );
    } catch {
      competitionMatches = [];
    }
  }

  const homeRecent = getTeamRecentMatches(input.homeId, competitionMatches, limit);
  const awayRecent = getTeamRecentMatches(input.awayId, competitionMatches, limit);
  const h2h = getHeadToHeadMatches(input.homeId, input.awayId, competitionMatches, limit);

  return {
    homeForm: homeRecent.map((r) => r.result),
    awayForm: awayRecent.map((r) => r.result),
    homeRecent,
    awayRecent,
    h2h,
    h2hSummary: h2hSummaryFromMatches(input.homeId, input.awayId, competitionMatches),
    sources: {
      homeRecent: "competition",
      awayRecent: "competition",
      h2h: "competition",
    },
  };
}
