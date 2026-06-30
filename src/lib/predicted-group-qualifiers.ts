import {
  buildTeamIdToGroupKeyFromMatches,
  WC_GROUP_LETTERS,
  type FootballDataMatch,
  type GroupStanding,
  type StandingTableRow,
} from "@/lib/football-data";
import {
  compareRowsForCrossGroupRanking,
  type MatchPredictionInput,
  WC_BEST_THIRD_PLACES_COUNT,
} from "@/lib/wc-scoring";

type MutableStats = {
  team: StandingTableRow["team"];
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

function predictedScore(
  pred: MatchPredictionInput,
): { home: number; away: number } | null {
  if (
    pred.predHomeGoals != null &&
    pred.predAwayGoals != null &&
    pred.predHomeGoals >= 0 &&
    pred.predAwayGoals >= 0
  ) {
    return { home: pred.predHomeGoals, away: pred.predAwayGoals };
  }
  if (pred.ftOutcome === "HOME") return { home: 1, away: 0 };
  if (pred.ftOutcome === "AWAY") return { home: 0, away: 1 };
  if (pred.ftOutcome === "DRAW") return { home: 1, away: 1 };
  return null;
}

/** Clasament simulat din pronosticurile la meciurile de grupă. */
export function buildPredictedGroupStandings(
  matches: FootballDataMatch[],
  predictionsByMatchId: Map<number, MatchPredictionInput>,
): GroupStanding[] {
  const teamToGroup = buildTeamIdToGroupKeyFromMatches(matches);
  const statsByTeamId = new Map<number, MutableStats>();

  for (const m of matches) {
    if ((m.stage ?? "") !== "GROUP_STAGE") continue;
    for (const t of [m.homeTeam, m.awayTeam]) {
      const id = t.id;
      if (id == null || statsByTeamId.has(id)) continue;
      statsByTeamId.set(id, {
        team: t,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
  }

  for (const m of matches) {
    if ((m.stage ?? "") !== "GROUP_STAGE") continue;
    const pred = predictionsByMatchId.get(m.id);
    if (!pred) continue;
    const score = predictedScore(pred);
    if (!score) continue;

    const hid = m.homeTeam.id;
    const aid = m.awayTeam.id;
    if (hid == null || aid == null) continue;

    const hs = statsByTeamId.get(hid);
    const as = statsByTeamId.get(aid);
    if (!hs || !as) continue;

    hs.played++;
    as.played++;
    hs.goalsFor += score.home;
    hs.goalsAgainst += score.away;
    as.goalsFor += score.away;
    as.goalsAgainst += score.home;

    if (score.home > score.away) {
      hs.won++;
      hs.points += 3;
      as.lost++;
    } else if (score.away > score.home) {
      as.won++;
      as.points += 3;
      hs.lost++;
    } else {
      hs.draw++;
      as.draw++;
      hs.points += 1;
      as.points += 1;
    }
  }

  const byGroup = new Map<string, StandingTableRow[]>();
  for (const letter of WC_GROUP_LETTERS) {
    byGroup.set(`Group ${letter}`, []);
  }

  for (const [teamId, st] of statsByTeamId) {
    const gk = teamToGroup.get(teamId);
    if (!gk) continue;
    if (!byGroup.has(gk)) byGroup.set(gk, []);
    const gd = st.goalsFor - st.goalsAgainst;
    byGroup.get(gk)!.push({
      position: 0,
      team: st.team,
      playedGames: st.played,
      won: st.won,
      draw: st.draw,
      lost: st.lost,
      points: st.points,
      goalsFor: st.goalsFor,
      goalsAgainst: st.goalsAgainst,
      goalDifference: gd,
    });
  }

  for (const rows of byGroup.values()) {
    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdA =
        a.goalDifference ?? (a.goalsFor ?? 0) - (a.goalsAgainst ?? 0);
      const gdB =
        b.goalDifference ?? (b.goalsFor ?? 0) - (b.goalsAgainst ?? 0);
      if (gdB !== gdA) return gdB - gdA;
      return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
    });
    rows.forEach((row, i) => {
      row.position = i + 1;
    });
  }

  return [...byGroup.entries()]
    .filter(([, rows]) => rows.length > 0)
    .map(([groupKey, rows]) => ({
      letter: groupKey.replace(/^Group\s+/i, "") || "?",
      groupKey,
      rows,
    }));
}

/** Echipe calificate (top 2 + 8×loc 3) deduse din pronosticurile la faza grupelor. */
export function deriveAdvancingTeamIdsFromGroupPredictions(
  matches: FootballDataMatch[],
  predictionsByMatchId: Map<number, MatchPredictionInput>,
): number[] {
  const standings = buildPredictedGroupStandings(matches, predictionsByMatchId);
  const qualified = new Set<number>();
  const thirdPlaceRows: StandingTableRow[] = [];

  for (const g of standings) {
    const rows = [...g.rows].sort(
      (a, b) => (a.position ?? 999) - (b.position ?? 999),
    );
    for (let i = 0; i < Math.min(2, rows.length); i++) {
      const id = rows[i]?.team?.id;
      if (id != null) qualified.add(id);
    }
    if (rows.length >= 3) {
      thirdPlaceRows.push(rows[2]!);
    }
  }

  thirdPlaceRows.sort(compareRowsForCrossGroupRanking);
  for (const row of thirdPlaceRows.slice(0, WC_BEST_THIRD_PLACES_COUNT)) {
    const id = row.team?.id;
    if (id != null) qualified.add(id);
  }

  return [...qualified];
}
