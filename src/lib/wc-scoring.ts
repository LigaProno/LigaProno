import {
  lookup1x2Odd,
  lookupCorrectScoreOdd,
  lookupHtFtOdd,
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

export type MatchPointComponents = {
  htFt: number | null;
  correctScore: number | null;
};

function parseOutcome(v: string | null | undefined): Odds1x2Outcome | null {
  if (v === "HOME" || v === "DRAW" || v === "AWAY") return v;
  return null;
}

/** Baza combinată pauză+final (0.5 × 1). */
export const POINTS_HT_FT_COMBO_BASE = POINTS_HT_BASE * POINTS_FT_BASE;

function splitHtFtForColumns(combined: number): { halfTime: number; fullTime: number } {
  const baseSum = POINTS_HT_BASE + POINTS_FT_BASE;
  return {
    halfTime: roundPoints(combined * (POINTS_HT_BASE / baseSum)),
    fullTime: roundPoints(combined * (POINTS_FT_BASE / baseSum)),
  };
}

function computeHtFtPoints(
  ht: Odds1x2Outcome | null,
  ft: Odds1x2Outcome | null,
  htCorrect: boolean,
  ftCorrect: boolean,
  matchOdds?: MatchOddsRow | null,
): { halfTime: number; fullTime: number; combined: number } {
  if (htCorrect && ftCorrect && ht && ft) {
    const odd = lookupHtFtOdd(matchOdds, ht, ft);
    const combined = roundPoints(POINTS_HT_FT_COMBO_BASE * odd);
    const split = splitHtFtForColumns(combined);
    return { ...split, combined };
  }
  if (htCorrect && ht) {
    const combined = roundPoints(POINTS_HT_BASE * lookup1x2Odd(matchOdds, "ht1x2", ht));
    return { halfTime: combined, fullTime: 0, combined };
  }
  if (ftCorrect && ft) {
    const combined = roundPoints(POINTS_FT_BASE * lookup1x2Odd(matchOdds, "ft1x2", ft));
    return { halfTime: 0, fullTime: combined, combined };
  }
  return { halfTime: 0, fullTime: 0, combined: 0 };
}

/** Total = (pauză+final combinat) + scor exact independent. */
export function combineMatchPointsTotal(components: MatchPointComponents): number {
  return roundPoints((components.htFt ?? 0) + (components.correctScore ?? 0));
}

export type PotentialHtFtDisplay = {
  mode: "none" | "htOnly" | "ftOnly" | "combo";
  htFtPoints: number | null;
  htFtOdd: number | null;
  htLabel: string | null;
  ftLabel: string | null;
  correctScore: number | null;
};

export function computePotentialPointComponents(
  pred: {
    htOutcome?: string | null;
    ftOutcome?: string | null;
    predHomeGoals?: number | null;
    predAwayGoals?: number | null;
  },
  matchOdds?: MatchOddsRow | null,
): PotentialHtFtDisplay {
  const ht = parseOutcome(pred.htOutcome);
  const ft = parseOutcome(pred.ftOutcome);

  let htFtPoints: number | null = null;
  let htFtOdd: number | null = null;
  let mode: PotentialHtFtDisplay["mode"] = "none";

  if (ht && ft) {
    htFtOdd = lookupHtFtOdd(matchOdds, ht, ft);
    htFtPoints = roundPoints(POINTS_HT_FT_COMBO_BASE * htFtOdd);
    mode = "combo";
  } else if (ht) {
    htFtOdd = lookup1x2Odd(matchOdds, "ht1x2", ht);
    htFtPoints = roundPoints(POINTS_HT_BASE * htFtOdd);
    mode = "htOnly";
  } else if (ft) {
    htFtOdd = lookup1x2Odd(matchOdds, "ft1x2", ft);
    htFtPoints = roundPoints(POINTS_FT_BASE * htFtOdd);
    mode = "ftOnly";
  }

  let correctScore: number | null = null;
  if (
    pred.predHomeGoals != null &&
    pred.predAwayGoals != null &&
    pred.predHomeGoals >= 0 &&
    pred.predAwayGoals >= 0
  ) {
    const csOdd = lookupCorrectScoreOdd(matchOdds, pred.predHomeGoals, pred.predAwayGoals);
    correctScore = roundPoints(POINTS_CORRECT_SCORE_BASE * csOdd);
  }

  return {
    mode,
    htFtPoints,
    htFtOdd,
    htLabel: ht === "HOME" ? "1" : ht === "DRAW" ? "X" : ht === "AWAY" ? "2" : null,
    ftLabel: ft === "HOME" ? "1" : ft === "DRAW" ? "X" : ft === "AWAY" ? "2" : null,
    correctScore,
  };
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

  const hits = computeMatchPredictionHits(pred, match);
  const htOutcome = parseOutcome(pred.htOutcome);
  const ftOutcome = parseOutcome(pred.ftOutcome);
  const { halfTime, fullTime, combined } = computeHtFtPoints(
    htOutcome,
    ftOutcome,
    hits.htCorrect,
    hits.ftCorrect,
    matchOdds,
  );

  let correctScore = 0;
  if (hits.scoreCorrect && ft90) {
    const oddCs = lookupCorrectScoreOdd(matchOdds, ft90.home, ft90.away);
    correctScore = roundPoints(POINTS_CORRECT_SCORE_BASE * oddCs);
  }

  return {
    halfTime,
    fullTime,
    correctScore,
    total: combineMatchPointsTotal({ htFt: combined, correctScore }),
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
  let matchPoints = 0;
  for (const m of matches) {
    const pred = matchPredictionsByMatchId.get(m.id);
    if (!pred) continue;
    const oddsRow = oddsMaps?.matchById.get(m.id) ?? null;
    const b = computeMatchPoints(pred, m, oddsRow);
    halfTimeGuessPoints += b.halfTime;
    fullTimeGuessPoints += b.fullTime;
    correctScorePoints += b.correctScore;
    matchPoints += b.total;
    if (computeMatchPredictionHits(pred, m).scoreCorrect) {
      correctScoreCount++;
    }
  }

  return {
    fullTimeGuessPoints: roundPoints(fullTimeGuessPoints),
    halfTimeGuessPoints: roundPoints(halfTimeGuessPoints),
    correctScorePoints: roundPoints(correctScorePoints),
    correctScoreCount,
    matchPoints: roundPoints(matchPoints),
    total: roundPoints(matchPoints),
  };
}
