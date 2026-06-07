import {
  lookup1x2Odd,
  lookupCorrectScoreOdd,
  lookupTeamOutrightOdd,
  lookupTeamQualifyOdd,
  type MatchOddsRow,
  type Odds1x2Outcome,
  type TournamentOddsMaps,
} from "@/lib/betting-odds";
import { POINTS_PER_PREDICTION_CHANGE_AFTER_START } from "@/lib/prediction-window";
import type {
  FootballDataMatch,
  GroupStanding,
  StandingTableRow,
} from "@/lib/football-data";

export { COMPETITION_WC_2026 } from "@/lib/competition";

export type MatchOutcome = Odds1x2Outcome;

/** Punctaj de bază pentru pauză (înmulțit cu cota rezultatului real). */
export const POINTS_HT_BASE = 0.5;
/** Punctaj de bază pentru final 1X2. */
export const POINTS_FT_BASE = 1;
/** Punctaj de bază pentru scor exact. */
export const POINTS_CORRECT_SCORE_BASE = 3;
/** Punctaj de bază per echipă ghicită calificată din grupe. */
export const POINTS_QUALIFIER_TEAM_BASE = 2.5;
/** Punctaj de bază pentru campion ghicit. */
export const POINTS_CHAMPION_BASE = 12;

export function roundPoints(n: number): number {
  return Math.round(n * 100) / 100;
}

export function outcomeFromScores(home: number, away: number): MatchOutcome {
  if (home > away) return "HOME";
  if (away > home) return "AWAY";
  return "DRAW";
}

function finalWinnerTeamId(m: FootballDataMatch): number | null {
  if (m.stage !== "FINAL" || m.status !== "FINISHED") return null;
  const ft = m.score?.fullTime;
  const h = ft?.home;
  const a = ft?.away;
  if (h != null && a != null && h !== a) {
    return h > a ? (m.homeTeam.id ?? null) : (m.awayTeam.id ?? null);
  }
  const w = m.score?.winner;
  if (w === "HOME_TEAM" && m.homeTeam.id !== undefined) return m.homeTeam.id;
  if (w === "AWAY_TEAM" && m.awayTeam.id !== undefined) return m.awayTeam.id;
  return null;
}

export function getFinalWinnerFromMatches(
  matches: FootballDataMatch[],
): number | null {
  const fin = matches.find((x) => x.stage === "FINAL");
  if (!fin) return null;
  return finalWinnerTeamId(fin);
}

/** Compară două rânduri de clasament (ex. locul 3 între grupe). */
function compareRowsForCrossGroupRanking(
  a: StandingTableRow,
  b: StandingTableRow,
): number {
  if (b.points !== a.points) return b.points - a.points;
  const gdA =
    a.goalDifference ?? (a.goalsFor ?? 0) - (a.goalsAgainst ?? 0);
  const gdB =
    b.goalDifference ?? (b.goalsFor ?? 0) - (b.goalsAgainst ?? 0);
  if (gdB !== gdA) return gdB - gdA;
  if ((b.goalsFor ?? 0) !== (a.goalsFor ?? 0)) {
    return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
  }
  const idA = a.team?.id ?? 0;
  const idB = b.team?.id ?? 0;
  return idA - idB;
}

function collectLast32TeamIds(matches: FootballDataMatch[]): Set<number> {
  const last32 = new Set<number>();
  for (const m of matches) {
    if (m.stage !== "LAST_32") continue;
    const hid = m.homeTeam?.id;
    const aid = m.awayTeam?.id;
    if (hid !== undefined) last32.add(hid);
    if (aid !== undefined) last32.add(aid);
  }
  return last32;
}

/** True when every group-stage fixture is finished (then standings reflect final group order). */
export function areAllGroupStageMatchesFinished(
  matches: FootballDataMatch[],
): boolean {
  const groupMatches = matches.filter((m) => m.stage === "GROUP_STAGE");
  if (groupMatches.length === 0) return false;
  return groupMatches.every((m) => m.status === "FINISHED");
}

/**
 * 32 de echipe din clasament + reguli locul 3 (doar pentru scorare când faza grupelor s-a încheiat).
 */
function qualifiedSetFromStandings(
  standings: GroupStanding[],
): Set<number> {
  const qualified = new Set<number>();
  const thirdPlaceRows: StandingTableRow[] = [];

  for (const g of standings) {
    const rows = [...g.rows].sort(
      (a, b) => (a.position ?? 999) - (b.position ?? 999),
    );
    for (let i = 0; i < Math.min(2, rows.length); i++) {
      const id = rows[i]?.team?.id;
      if (id !== undefined) qualified.add(id);
    }
    if (rows.length >= 3) {
      thirdPlaceRows.push(rows[2]);
    }
  }

  thirdPlaceRows.sort(compareRowsForCrossGroupRanking);
  for (const row of thirdPlaceRows.slice(0, 8)) {
    const id = row.team?.id;
    if (id !== undefined) qualified.add(id);
  }

  return qualified;
}

/**
 * Mulțimea de echipe folosită la punctajul **CG**: doar când calificările sunt cunoscute.
 *
 * - Dacă există bracket LAST_32 complet (32 de echipe) → folosim acea mulțime.
 * - Altfel, doar după ce **toate** meciurile din faza grupelor sunt `FINISHED` → top 2 + 8×locul 3 din clasament.
 * - Înainte de aceste momente → mulțime goală (CG = 0; pronosticurile nu sunt încă comparate cu „adevărul”).
 */
export function resolveActualAdvancingTeamIdsForScoring(
  matches: FootballDataMatch[],
  standings: GroupStanding[],
): Set<number> {
  const last32 = collectLast32TeamIds(matches);
  if (last32.size === 32) return last32;

  if (areAllGroupStageMatchesFinished(matches)) {
    return qualifiedSetFromStandings(standings);
  }

  return new Set();
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

export function computeMatchPoints(
  pred: MatchPredictionInput,
  match: FootballDataMatch,
  matchOdds?: MatchOddsRow | null,
): MatchPointsBreakdown {
  const empty = { halfTime: 0, fullTime: 0, correctScore: 0, total: 0 };
  if (match.status !== "FINISHED") return empty;

  const ft = match.score?.fullTime;
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
  if (ft?.home != null && ft?.away != null) {
    const actualFt = outcomeFromScores(ft.home, ft.away);
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
      pred.predHomeGoals === ft.home &&
      pred.predAwayGoals === ft.away
    ) {
      const oddCs = lookupCorrectScoreOdd(matchOdds, ft.home, ft.away);
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

export function computeQualifierPoints(
  predictedIds: number[],
  actualSet: Set<number>,
  oddsMaps?: TournamentOddsMaps | null,
): number {
  let sum = 0;
  const seen = new Set<number>();
  for (const id of predictedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (!actualSet.has(id)) continue;
    const odd = oddsMaps ? lookupTeamQualifyOdd(oddsMaps, id) : 1;
    sum += POINTS_QUALIFIER_TEAM_BASE * odd;
  }
  return roundPoints(sum);
}

export function computeChampionPoints(
  predictedChampionId: number | null | undefined,
  actualChampionId: number | null,
  oddsMaps?: TournamentOddsMaps | null,
): number {
  if (
    predictedChampionId == null ||
    actualChampionId == null ||
    predictedChampionId !== actualChampionId
  ) {
    return 0;
  }
  const odd =
    oddsMaps ? lookupTeamOutrightOdd(oddsMaps, actualChampionId) : 1;
  return roundPoints(POINTS_CHAMPION_BASE * odd);
}

/** Puncte potențiale dacă echipa aleasă câștigă turneul. */
export function computePotentialChampionPoints(
  predictedChampionId: number | null | undefined,
  oddsMaps?: TournamentOddsMaps | null,
): number | null {
  if (predictedChampionId == null || predictedChampionId <= 0) return null;
  const odd =
    oddsMaps ? lookupTeamOutrightOdd(oddsMaps, predictedChampionId) : 1;
  return roundPoints(POINTS_CHAMPION_BASE * odd);
}

/** Puncte potențiale dacă toate echipele alese se califică din grupe. */
export function computePotentialQualifierPoints(
  predictedIds: number[],
  oddsMaps?: TournamentOddsMaps | null,
): number | null {
  if (predictedIds.length === 0) return null;
  let sum = 0;
  const seen = new Set<number>();
  for (const id of predictedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const odd = oddsMaps ? lookupTeamQualifyOdd(oddsMaps, id) : 1;
    sum += POINTS_QUALIFIER_TEAM_BASE * odd;
  }
  return roundPoints(sum);
}

export type UserWcTotals = {
  /** Full-time outcome points (FG). */
  fullTimeGuessPoints: number;
  /** Half-time outcome points (PG). */
  halfTimeGuessPoints: number;
  /** Exact score points (SC). */
  correctScorePoints: number;
  /** Sum of FG + PG + SC (match-related only). */
  matchPoints: number;
  /** Qualifier picks points (CG). */
  qualifierPoints: number;
  championPoints: number;
  /** Puncte pierdute la modificări după start (10 × număr de schimbări). */
  predictionChangePenalty: number;
  total: number;
};

export function computeUserWcTotals(
  matchPredictionsByMatchId: Map<number, MatchPredictionInput>,
  extra: { advancingTeamIds: number[]; championTeamId: number | null } | null,
  matches: FootballDataMatch[],
  standings: GroupStanding[],
  oddsMaps?: TournamentOddsMaps | null,
  midCompetitionPredictionChangeCount = 0,
): UserWcTotals {
  let fullTimeGuessPoints = 0;
  let halfTimeGuessPoints = 0;
  let correctScorePoints = 0;
  for (const m of matches) {
    const pred = matchPredictionsByMatchId.get(m.id);
    if (!pred) continue;
    const oddsRow = oddsMaps?.matchById.get(m.id) ?? null;
    const b = computeMatchPoints(pred, m, oddsRow);
    halfTimeGuessPoints += b.halfTime;
    fullTimeGuessPoints += b.fullTime;
    correctScorePoints += b.correctScore;
  }
  const matchPoints = roundPoints(
    fullTimeGuessPoints + halfTimeGuessPoints + correctScorePoints,
  );

  const advancingSet = resolveActualAdvancingTeamIdsForScoring(
    matches,
    standings,
  );
  const qualifierPoints =
    extra?.advancingTeamIds?.length ?
      computeQualifierPoints(
        extra.advancingTeamIds,
        advancingSet,
        oddsMaps ?? null,
      )
    : 0;

  const championActual = getFinalWinnerFromMatches(matches);
  const championPoints = computeChampionPoints(
    extra?.championTeamId ?? null,
    championActual,
    oddsMaps ?? null,
  );

  const predictionChangePenalty = roundPoints(
    POINTS_PER_PREDICTION_CHANGE_AFTER_START *
      Math.max(0, midCompetitionPredictionChangeCount),
  );
  const gross = roundPoints(matchPoints + qualifierPoints + championPoints);

  return {
    fullTimeGuessPoints: roundPoints(fullTimeGuessPoints),
    halfTimeGuessPoints: roundPoints(halfTimeGuessPoints),
    correctScorePoints: roundPoints(correctScorePoints),
    matchPoints,
    qualifierPoints,
    championPoints,
    predictionChangePenalty,
    total: roundPoints(gross - predictionChangePenalty),
  };
}
