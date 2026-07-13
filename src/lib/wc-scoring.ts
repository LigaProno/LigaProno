import {
  lookup1x2Odd,
  lookupCorrectScoreOdd,
  type MatchOddsRow,
  type Odds1x2Outcome,
  type TournamentOddsMaps,
} from "@/lib/betting-odds";
import { getMatchScoreAfter90 } from "@/lib/match-score";
import type { FootballDataMatch } from "@/lib/football-data";

export type MatchOutcome = Odds1x2Outcome;

export const POINTS_HT_BASE = 0.5;
export const POINTS_FT_BASE = 1;
export const POINTS_CORRECT_SCORE_BASE = 3;

export function roundPoints(n: number): number {
  return Math.round(n * 100) / 100;
}

export function outcomeFromScores(home: number, away: number): MatchOutcome {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

export type MatchPredictionInput = {
  htOutcome?: string | null;
  ftOutcome?: string | null;
  predHomeGoals?: number | null;
  predAwayGoals?: number | null;
};

export type MatchPointsBreakdown = {
  halfTime: number;
  fullTime: number;
  correctScore: number;
  total: number;
};

export type MatchPredictionHits = {
  htCorrect: boolean;
  ftCorrect: boolean;
  scoreCorrect: boolean;
};

export function computeMatchPredictionHits(
  pred: MatchPredictionInput,
  match: FootballDataMatch,
): MatchPredictionHits {
  const ht = match.score?.halfTime;
  const ft90 = getMatchScoreAfter90(match);

  let htCorrect = false;
  if (
    pred.htOutcome &&
    ht?.home != null &&
    ht?.away != null &&
    (pred.htOutcome === "HOME" ||
      pred.htOutcome === "AWAY" ||
      pred.htOutcome === "DRAW")
  ) {
    htCorrect = outcomeFromScores(ht.home, ht.away) === pred.htOutcome;
  }

  let ftCorrect = false;
  let scoreCorrect = false;
  if (ft90) {
    const actualFt = outcomeFromScores(ft90.home, ft90.away);
    if (
      pred.ftOutcome &&
      (pred.ftOutcome === "HOME" ||
        pred.ftOutcome === "AWAY" ||
        pred.ftOutcome === "DRAW") &&
      actualFt === pred.ftOutcome
    ) {
      ftCorrect = true;
    }
    if (
      pred.predHomeGoals != null &&
      pred.predAwayGoals != null &&
      pred.predHomeGoals === ft90.home &&
      pred.predAwayGoals === ft90.away
    ) {
      scoreCorrect = true;
    }
  }

  return { htCorrect, ftCorrect, scoreCorrect };
}

export function computeMatchPoints(
  pred: MatchPredictionInput,
  match: FootballDataMatch,
  matchOdds?: MatchOddsRow | null,
): MatchPointsBreakdown {
  const empty = { halfTime: 0, fullTime: 0, correctScore: 0, total: 0 };
  if (match.status !== "FINISHED") return empty;

  const ft90 = getMatchScoreAfter90(match);
  const ht = match.score?.halfTime;

  let halfTime = 0;
  if (
    pred.htOutcome &&
    ht?.home != null &&
    ht?.away != null &&
    (pred.htOutcome === "HOME" ||
      pred.htOutcome === "AWAY" ||
      pred.htOutcome === "DRAW")
  ) {
    const actualHt = outcomeFromScores(ht.home!, ht.away!);
    if (actualHt === pred.htOutcome) {
      const odd = lookup1x2Odd(matchOdds, "ht1x2", actualHt);
      halfTime = roundPoints(POINTS_HT_BASE * odd);
    }
  }

  let fullTime = 0;
  let correctScore = 0;
  if (ft90) {
    const actualFt = outcomeFromScores(ft90.home, ft90.away);
    if (
      pred.ftOutcome &&
      (pred.ftOutcome === "HOME" ||
        pred.ftOutcome === "AWAY" ||
        pred.ftOutcome === "DRAW") &&
      actualFt === pred.ftOutcome
    ) {
      const odd = lookup1x2Odd(matchOdds, "ft1x2", actualFt);
      fullTime = roundPoints(POINTS_FT_BASE * odd);
    }
    if (
      pred.predHomeGoals != null &&
      pred.predAwayGoals != null &&
      pred.predHomeGoals === ft90.home &&
      pred.predAwayGoals === ft90.away
    ) {
      const oddCs = lookupCorrectScoreOdd(matchOdds, ft90.home, ft90.away);
      correctScore = roundPoints(POINTS_CORRECT_SCORE_BASE * oddCs);
    }
  }

  return {
    halfTime,
    fullTime,
    correctScore,
    total: roundPoints(halfTime + fullTime + correctScore),
  };
}

export type UserWcTotals = {
  fullTimeGuessPoints: number;
  halfTimeGuessPoints: number;
  correctScorePoints: number;
  correctScoreCount: number;
  matchPoints: number;
  total: number;
};

export function computeUserWcTotals(
  matchPredictionsByMatchId: Map<number, MatchPredictionInput>,
  matches: FootballDataMatch[],
  oddsMaps?: TournamentOddsMaps | null,
): UserWcTotals {
  let fullTimeGuessPoints = 0;
  let halfTimeGuessPoints = 0;
  let correctScorePoints = 0;
  let correctScoreCount = 0;
  for (const m of matches) {
    const pred = matchPredictionsByMatchId.get(m.id);
    if (!pred) continue;
    const oddsRow = oddsMaps?.matchById.get(m.id) ?? null;
    const b = computeMatchPoints(pred, m, oddsRow);
    halfTimeGuessPoints += b.halfTime;
    fullTimeGuessPoints += b.fullTime;
    correctScorePoints += b.correctScore;
    if (computeMatchPredictionHits(pred, m).scoreCorrect) {
      correctScoreCount++;
    }
  }
  const matchPoints = roundPoints(
    fullTimeGuessPoints + halfTimeGuessPoints + correctScorePoints,
  );

  return {
    fullTimeGuessPoints: roundPoints(fullTimeGuessPoints),
    halfTimeGuessPoints: roundPoints(halfTimeGuessPoints),
    correctScorePoints: roundPoints(correctScorePoints),
    correctScoreCount,
    matchPoints,
    total: matchPoints,
  };
}
