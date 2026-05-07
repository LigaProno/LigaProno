import type {
  FootballDataMatch,
  GroupStanding,
  StandingTableRow,
} from "@/lib/football-data";

/** Valoare `Tournament.competition` pentru CM 2026. */
export const COMPETITION_WC_2026 = "WC_2026";

export const POINTS_HT = 1;
export const POINTS_FT = 3;
export const POINTS_CORRECT_SCORE = 5;
export const POINTS_QUALIFIER_TEAM = 4;
export const POINTS_CHAMPION = 15;

export type MatchOutcome = "HOME" | "AWAY" | "DRAW";

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
    if (actualHt === pred.htOutcome) halfTime = POINTS_HT;
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
      fullTime = POINTS_FT;
    }
    if (
      pred.predHomeGoals != null &&
      pred.predAwayGoals != null &&
      pred.predHomeGoals === ft.home &&
      pred.predAwayGoals === ft.away
    ) {
      correctScore = POINTS_CORRECT_SCORE;
    }
  }

  return {
    halfTime,
    fullTime,
    correctScore,
    total: halfTime + fullTime + correctScore,
  };
}

export function computeQualifierPoints(
  predictedIds: number[],
  actualSet: Set<number>,
): number {
  let n = 0;
  const seen = new Set<number>();
  for (const id of predictedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (actualSet.has(id)) n += 1;
  }
  return n * POINTS_QUALIFIER_TEAM;
}

export function computeChampionPoints(
  predictedChampionId: number | null | undefined,
  actualChampionId: number | null,
): number {
  if (
    predictedChampionId == null ||
    actualChampionId == null ||
    predictedChampionId !== actualChampionId
  ) {
    return 0;
  }
  return POINTS_CHAMPION;
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
  total: number;
};

export function computeUserWcTotals(
  matchPredictionsByMatchId: Map<number, MatchPredictionInput>,
  extra: { advancingTeamIds: number[]; championTeamId: number | null } | null,
  matches: FootballDataMatch[],
  standings: GroupStanding[],
): UserWcTotals {
  let fullTimeGuessPoints = 0;
  let halfTimeGuessPoints = 0;
  let correctScorePoints = 0;
  for (const m of matches) {
    const pred = matchPredictionsByMatchId.get(m.id);
    if (!pred) continue;
    const b = computeMatchPoints(pred, m);
    halfTimeGuessPoints += b.halfTime;
    fullTimeGuessPoints += b.fullTime;
    correctScorePoints += b.correctScore;
  }
  const matchPoints =
    fullTimeGuessPoints + halfTimeGuessPoints + correctScorePoints;

  const advancingSet = resolveActualAdvancingTeamIdsForScoring(
    matches,
    standings,
  );
  const qualifierPoints =
    extra?.advancingTeamIds?.length ?
      computeQualifierPoints(extra.advancingTeamIds, advancingSet)
    : 0;

  const championActual = getFinalWinnerFromMatches(matches);
  const championPoints = computeChampionPoints(
    extra?.championTeamId ?? null,
    championActual,
  );

  return {
    fullTimeGuessPoints,
    halfTimeGuessPoints,
    correctScorePoints,
    matchPoints,
    qualifierPoints,
    championPoints,
    total: matchPoints + qualifierPoints + championPoints,
  };
}
