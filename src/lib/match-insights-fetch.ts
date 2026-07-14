import {
  fetchCompetitionMatches,
  fetchMatchHeadToHead,
  fetchTeamFinishedMatches,
  type FootballDataMatch,
} from "@/lib/football-data";
import {
  getHeadToHeadMatches,
  getTeamFormString,
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

function dedupeMatches(list: FootballDataMatch[]): FootballDataMatch[] {
  const seen = new Set<number>();
  const out: FootballDataMatch[] = [];
  for (const m of list) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function mergeRecent(
  teamId: number,
  apiMatches: FootballDataMatch[],
  competitionMatches: FootballDataMatch[],
  limit: number,
): { rows: RecentMatchRow[]; source: MatchInsightsPayload["sources"]["homeRecent"] } {
  const fromApi = getTeamRecentMatches(teamId, apiMatches, limit);
  if (fromApi.length >= limit) {
    return { rows: fromApi, source: "api" };
  }

  const fromComp = getTeamRecentMatches(teamId, competitionMatches, limit);
  const merged = dedupeMatches([...apiMatches, ...competitionMatches]);
  const rows = getTeamRecentMatches(teamId, merged, limit);

  if (fromApi.length === 0 && fromComp.length > 0) return { rows, source: "competition" };
  if (fromApi.length > 0 && fromComp.length > rows.length) return { rows, source: "mixed" };
  if (fromApi.length > 0) return { rows, source: rows.length > fromApi.length ? "mixed" : "api" };
  return { rows, source: "competition" };
}

function mergeH2H(
  homeId: number,
  awayId: number,
  apiMatches: FootballDataMatch[],
  competitionMatches: FootballDataMatch[],
  limit: number,
): { rows: H2HRow[]; source: MatchInsightsPayload["sources"]["h2h"] } {
  const fromApi = getHeadToHeadMatches(homeId, awayId, apiMatches, limit);
  if (fromApi.length >= limit) {
    return { rows: fromApi, source: "api" };
  }

  const merged = dedupeMatches([...apiMatches, ...competitionMatches]);
  const rows = getHeadToHeadMatches(homeId, awayId, merged, limit);

  if (fromApi.length === 0 && rows.length > 0) return { rows, source: "competition" };
  if (fromApi.length > 0 && rows.length > fromApi.length) return { rows, source: "mixed" };
  if (fromApi.length > 0) return { rows: fromApi, source: "api" };
  return { rows, source: "competition" };
}

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

  const [homeApi, awayApi, h2hResult] = await Promise.all([
    fetchTeamFinishedMatches(input.homeId, 15).catch(() => [] as FootballDataMatch[]),
    fetchTeamFinishedMatches(input.awayId, 15).catch(() => [] as FootballDataMatch[]),
    fetchMatchHeadToHead(input.matchId, 15).catch(() => ({
      matches: [] as FootballDataMatch[],
      aggregates: undefined,
    })),
  ]);

  const homeMerged = mergeRecent(input.homeId, homeApi, competitionMatches, limit);
  const awayMerged = mergeRecent(input.awayId, awayApi, competitionMatches, limit);
  const h2hMerged = mergeH2H(
    input.homeId,
    input.awayId,
    h2hResult.matches,
    competitionMatches,
    limit,
  );

  const agg = h2hResult.aggregates;
  const h2hSummary =
    agg && (agg.homeTeamWins != null || agg.awayTeamWins != null || agg.draws != null) ?
      {
        homeWins: agg.homeTeamWins ?? 0,
        awayWins: agg.awayTeamWins ?? 0,
        draws: agg.draws ?? 0,
      }
    : null;

  return {
    homeForm: homeMerged.rows.map((r) => r.result),
    awayForm: awayMerged.rows.map((r) => r.result),
    homeRecent: homeMerged.rows,
    awayRecent: awayMerged.rows,
    h2h: h2hMerged.rows,
    h2hSummary,
    sources: {
      homeRecent: homeMerged.source,
      awayRecent: awayMerged.source,
      h2h: h2hMerged.source,
    },
  };
}
