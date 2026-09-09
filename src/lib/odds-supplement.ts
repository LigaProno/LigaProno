import type { FootballDataMatch } from "@/lib/football-data-types";
import {
  countTeamsWithQualifyOdds,
  fillEstimatedQualifyOdds,
  mergeBettingPayloads,
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import { fetchTeamOddsViaGemini, isGeminiApiKeyConfigured } from "@/lib/gemini-odds-fetch";
import type { OddsFetchContext } from "@/lib/odds-providers/types";
import { matchesForMatchday, resolveCurrentMatchday } from "@/lib/wc-pred-display";
import { competitionHasGroupStage } from "@/lib/competition";

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

/**
 * Doar meciurile etapei curente (nu tot sezonul) — Gemini ar da timeout dacă i-am
 * cere cotele pentru toate meciurile rămase. Etapa curentă = prima etapă cu meciuri
 * neîncheiate; când ultima se termină, `resolveCurrentMatchday` trece la următoarea.
 * Fără info de etapă (ex. tur eliminatoriu) cădem pe tot ce e viitor.
 */
export function currentFixtureMatches(matches: FootballDataMatch[]): FootballDataMatch[] {
  const scoped = upcomingMatchesWithKnownTeams(
    matchesForMatchday(matches, resolveCurrentMatchday(matches)),
  );
  return scoped.length > 0 ? scoped : upcomingMatchesWithKnownTeams(matches);
}

function teamsMissingQualifyOdds(
  payload: BettingOddsPayload,
  teams: { id: number; name: string }[],
): boolean {
  return teams.some((t) => payload.teams[String(t.id)]?.toQualifyFromGroup == null);
}

export type OddsSupplementResult = {
  payload: BettingOddsPayload;
  supplementedTeams: boolean;
  supplementedMatchCount: number;
};

/**
 * Completează singurul gol pe care OddsPortal chiar îl are: cotele de calificare
 * din grupă, piață pe care nu o publică.
 *
 * Piețele de meci (1X2, pauză, scor corect) NU se completează aici. Le luăm doar
 * de pe OddsPortal — dacă lipsesc, meciul rămâne fără cote, ceea ce se vede și se
 * poate remedia. Altfel am pune în loc cote inventate, imposibil de distins de
 * cele reale (marja lor arată la fel de plauzibil), care rămân apoi înțepenite în
 * snapshot pentru că trec drept „complete".
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

  if (
    competitionHasGroupStage(ctx.code) &&
    teamsMissingQualifyOdds(merged, ctx.teams)
  ) {
    const { payload: teamPayload } = await fetchTeamOddsViaGemini(
      ctx.competitionLabel,
      ctx.teams,
      { googleSearch: false },
    );
    merged = mergeBettingPayloads(
      sanitizeBettingPayload(teamPayload),
      merged,
      { lockedMatchIds: ctx.lockedMatchIds },
    );
    supplementedTeams = countTeamsWithQualifyOdds(merged) > 0;
  }

  if (teamsMissingQualifyOdds(merged, ctx.teams)) {
    merged = fillEstimatedQualifyOdds(merged);
    supplementedTeams = true;
  }

  return { payload: merged, supplementedTeams, supplementedMatchCount };
}
