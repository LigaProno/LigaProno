import {
  lookup1x2Odd,
  lookupCorrectScoreOdd,
  lookupTeamOutrightOdd,
  type TournamentOddsMaps,
  type Liga1StandingRow,
} from "@/lib/betting-odds";
import {
  POINTS_HT_BASE,
  POINTS_FT_BASE,
  POINTS_CORRECT_SCORE_BASE,
  POINTS_QUALIFIER_TEAM_BASE,
  POINTS_CHAMPION_BASE,
  roundPoints,
  outcomeFromScores,
  type MatchPredictionInput,
  type MatchPointsBreakdown,
} from "@/lib/wc-scoring";
import { POINTS_PER_PREDICTION_CHANGE_AFTER_START } from "@/lib/prediction-window";

export type Liga1FixtureForScoring = {
  internalMatchId: number;
  matchday: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  utcDate: Date | string;
  status: string;
  htHome: number | null;
  htAway: number | null;
  ftHome: number | null;
  ftAway: number | null;
};

export type Liga1UserTotals = {
  fullTimeGuessPoints: number;
  halfTimeGuessPoints: number;
  correctScorePoints: number;
  matchPoints: number;
  top4Points: number;
  championPoints: number;
  predictionChangePenalty: number;
  total: number;
};

export function isLiga1CompetitionUnderway(
  fixtures: Pick<Liga1FixtureForScoring, "status" | "utcDate">[],
  now = new Date(),
): boolean {
  const t = now.getTime();
  for (const f of fixtures) {
    if (["IN_PLAY", "PAUSED", "FINISHED"].includes(f.status)) return true;
    const kick = typeof f.utcDate === "string" ? Date.parse(f.utcDate) : (f.utcDate as Date).getTime();
    if (!Number.isNaN(kick) && kick <= t) return true;
  }
  return false;
}

function computeLiga1MatchPoints(
  pred: MatchPredictionInput,
  fixture: Liga1FixtureForScoring,
  oddsMaps?: TournamentOddsMaps | null,
): MatchPointsBreakdown {
  const empty = { halfTime: 0, fullTime: 0, correctScore: 0, total: 0 };
  if (fixture.status !== "FINISHED") return empty;
  if (fixture.ftHome == null || fixture.ftAway == null) return empty;

  const matchOdds = oddsMaps?.matchById.get(fixture.internalMatchId) ?? null;

  let halfTime = 0;
  if (
    pred.htOutcome &&
    fixture.htHome != null &&
    fixture.htAway != null &&
    (pred.htOutcome === "HOME" || pred.htOutcome === "AWAY" || pred.htOutcome === "DRAW")
  ) {
    const actualHt = outcomeFromScores(fixture.htHome, fixture.htAway);
    if (actualHt === pred.htOutcome) {
      const odd = lookup1x2Odd(matchOdds, "ht1x2", actualHt);
      halfTime = roundPoints(POINTS_HT_BASE * odd);
    }
  }

  let fullTime = 0;
  let correctScore = 0;
  const actualFt = outcomeFromScores(fixture.ftHome, fixture.ftAway);
  if (
    pred.ftOutcome &&
    (pred.ftOutcome === "HOME" || pred.ftOutcome === "AWAY" || pred.ftOutcome === "DRAW") &&
    actualFt === pred.ftOutcome
  ) {
    const odd = lookup1x2Odd(matchOdds, "ft1x2", actualFt);
    fullTime = roundPoints(POINTS_FT_BASE * odd);
  }
  if (
    pred.predHomeGoals != null &&
    pred.predAwayGoals != null &&
    pred.predHomeGoals === fixture.ftHome &&
    pred.predAwayGoals === fixture.ftAway
  ) {
    const oddCs = lookupCorrectScoreOdd(matchOdds, fixture.ftHome, fixture.ftAway);
    correctScore = roundPoints(POINTS_CORRECT_SCORE_BASE * oddCs);
  }

  return {
    halfTime,
    fullTime,
    correctScore,
    total: roundPoints(halfTime + fullTime + correctScore),
  };
}

/** Top-4 is considered final when all fixtures are FINISHED. */
function resolveTop4(
  fixtures: Liga1FixtureForScoring[],
  liga1Standings?: Liga1StandingRow[],
): Set<number> {
  if (!liga1Standings || liga1Standings.length === 0) return new Set();
  const allFinished = fixtures.length > 0 && fixtures.every((f) => f.status === "FINISHED");
  if (!allFinished) return new Set();
  return new Set(liga1Standings.slice(0, 4).map((r) => r.teamId));
}

function resolveChampion(
  fixtures: Liga1FixtureForScoring[],
  liga1Standings?: Liga1StandingRow[],
): number | null {
  const allFinished = fixtures.length > 0 && fixtures.every((f) => f.status === "FINISHED");
  if (!allFinished) return null;
  return liga1Standings?.[0]?.teamId ?? null;
}

export function computeLiga1UserTotals(
  matchPredictionsByMatchId: Map<number, MatchPredictionInput>,
  extra: { advancingTeamIds: number[]; championTeamId: number | null } | null,
  fixtures: Liga1FixtureForScoring[],
  oddsMaps?: TournamentOddsMaps | null,
  liga1Standings?: Liga1StandingRow[],
  midCompetitionPredictionChangeCount = 0,
): Liga1UserTotals {
  let fullTimeGuessPoints = 0;
  let halfTimeGuessPoints = 0;
  let correctScorePoints = 0;

  for (const f of fixtures) {
    const pred = matchPredictionsByMatchId.get(f.internalMatchId);
    if (!pred) continue;
    const b = computeLiga1MatchPoints(pred, f, oddsMaps);
    halfTimeGuessPoints += b.halfTime;
    fullTimeGuessPoints += b.fullTime;
    correctScorePoints += b.correctScore;
  }

  const matchPoints = roundPoints(fullTimeGuessPoints + halfTimeGuessPoints + correctScorePoints);

  const top4Set = resolveTop4(fixtures, liga1Standings);
  let top4Points = 0;
  if (extra?.advancingTeamIds?.length && top4Set.size > 0) {
    const seen = new Set<number>();
    for (const id of extra.advancingTeamIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (!top4Set.has(id)) continue;
      const odd = oddsMaps ? lookupTeamOutrightOdd(oddsMaps, id) : 1;
      top4Points += POINTS_QUALIFIER_TEAM_BASE * odd;
    }
    top4Points = roundPoints(top4Points);
  }

  const champion = resolveChampion(fixtures, liga1Standings);
  let championPoints = 0;
  if (
    extra?.championTeamId != null &&
    champion != null &&
    extra.championTeamId === champion
  ) {
    const odd = oddsMaps ? lookupTeamOutrightOdd(oddsMaps, champion) : 1;
    championPoints = roundPoints(POINTS_CHAMPION_BASE * odd);
  }

  const predictionChangePenalty = roundPoints(
    POINTS_PER_PREDICTION_CHANGE_AFTER_START * Math.max(0, midCompetitionPredictionChangeCount),
  );

  const gross = roundPoints(matchPoints + top4Points + championPoints);

  return {
    fullTimeGuessPoints: roundPoints(fullTimeGuessPoints),
    halfTimeGuessPoints: roundPoints(halfTimeGuessPoints),
    correctScorePoints: roundPoints(correctScorePoints),
    matchPoints,
    top4Points,
    championPoints,
    predictionChangePenalty,
    total: roundPoints(gross - predictionChangePenalty),
  };
}
