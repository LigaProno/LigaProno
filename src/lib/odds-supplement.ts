import type { FootballDataMatch } from "@/lib/football-data";
import {
  countTeamsWithQualifyOdds,
  fillEstimatedQualifyOdds,
  hasUsableMatchOdds,
  mergeBettingPayloads,
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import {
  fetchMatchOddsViaGemini,
  fetchTeamOddsViaGemini,
  isGeminiApiKeyConfigured,
} from "@/lib/gemini-odds-fetch";
import type { OddsFetchContext } from "@/lib/odds-providers/types";

function upcomingMatches(matches: FootballDataMatch[]): FootballDataMatch[] {
  return matches.filter((m) => m.status !== "FINISHED" && m.status !== "CANCELLED");
}

function teamsMissingQualifyOdds(
  payload: BettingOddsPayload,
  teams: { id: number; name: string }[],
): boolean {
  return teams.some((t) => payload.teams[String(t.id)]?.toQualifyFromGroup == null);
}

function matchesMissingOdds(
  payload: BettingOddsPayload,
  matches: FootballDataMatch[],
): FootballDataMatch[] {
  return matches.filter((m) => !hasUsableMatchOdds(payload.matches[String(m.id)]));
}

export type OddsSupplementResult = {
  payload: BettingOddsPayload;
  supplementedTeams: boolean;
  supplementedMatchCount: number;
};

/**
 * Completează golurile lăsate de OddsPortal: calificări din grupe (indisponibile acolo)
 * și meciuri nemapate / fără feed valid.
 */
export async function supplementOddsWithGemini(
  payload: BettingOddsPayload,
  ctx: OddsFetchContext,
): Promise<OddsSupplementResult> {
  if (!isGeminiApiKeyConfigured()) {
    return { payload, supplementedTeams: false, supplementedMatchCount: 0 };
  }

  let merged = payload;
  let supplementedTeams = false;
  let supplementedMatchCount = 0;

  if (teamsMissingQualifyOdds(merged, ctx.teams)) {
    const { payload: teamPayload } = await fetchTeamOddsViaGemini(
      ctx.competitionLabel,
      ctx.teams,
      { googleSearch: false },
    );
    merged = mergeBettingPayloads(
      sanitizeBettingPayload(teamPayload),
      merged,
    );
    supplementedTeams = countTeamsWithQualifyOdds(merged) > 0;
  }

  if (teamsMissingQualifyOdds(merged, ctx.teams)) {
    merged = fillEstimatedQualifyOdds(merged);
    supplementedTeams = true;
  }

  const missingMatches = matchesMissingOdds(merged, upcomingMatches(ctx.matches));
  if (missingMatches.length > 0) {
    const { payload: matchPayload } = await fetchMatchOddsViaGemini(
      ctx.competitionLabel,
      missingMatches,
    );
    merged = mergeBettingPayloads(
      sanitizeBettingPayload(matchPayload),
      merged,
    );
    supplementedMatchCount = missingMatches.length;
  }

  return { payload: merged, supplementedTeams, supplementedMatchCount };
}
