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

/** Meci viitor cu ambele echipe cunoscute (excludem placeholder-ele din tabloul KO). */
export function upcomingMatchesWithKnownTeams(
  matches: FootballDataMatch[],
): FootballDataMatch[] {
  return upcomingMatches(matches).filter(
    (m) =>
      m.homeTeam?.id != null &&
      m.awayTeam?.id != null &&
      Boolean(m.homeTeam.name ?? m.homeTeam.shortName) &&
      Boolean(m.awayTeam.name ?? m.awayTeam.shortName),
  );
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

/** Completează cotele lipsă pentru meciurile viitoare cu echipe cunoscute (max. 2 treceri). */
async function fillMissingUpcomingMatchOdds(
  payload: BettingOddsPayload,
  ctx: OddsFetchContext,
  competitionLabel: string,
): Promise<{ payload: BettingOddsPayload; filledCount: number }> {
  let merged = payload;
  let filledCount = 0;
  const target = upcomingMatchesWithKnownTeams(ctx.matches);

  for (let pass = 0; pass < 2; pass++) {
    const missing = matchesMissingOdds(merged, target);
    if (missing.length === 0) break;

    const { payload: matchPayload } = await fetchMatchOddsViaGemini(
      competitionLabel,
      missing,
      { googleSearch: false, timeoutMs: 180_000 },
    );
    const beforeMissing = missing.length;
    merged = mergeBettingPayloads(
      sanitizeBettingPayload(matchPayload),
      merged,
    );
    const afterMissing = matchesMissingOdds(merged, missing).length;
    filledCount += beforeMissing - afterMissing;
    if (beforeMissing === afterMissing) break;
  }

  return { payload: merged, filledCount };
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

  const { payload: withMatches, filledCount } = await fillMissingUpcomingMatchOdds(
    merged,
    ctx,
    ctx.competitionLabel,
  );
  merged = withMatches;
  supplementedMatchCount = filledCount;

  return { payload: merged, supplementedTeams, supplementedMatchCount };
}
