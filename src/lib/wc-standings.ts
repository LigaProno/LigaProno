import type { GroupStanding, StandingTableRow } from "@/lib/football-data";

const WC_BEST_THIRD_PLACES_COUNT = 8;

export type ThirdPlaceRankingEntry = {
  rank: number;
  qualifies: boolean;
  groupLetter: string;
  groupKey: string;
  row: StandingTableRow;
};

function compareRowsForCrossGroupRanking(
  a: StandingTableRow,
  b: StandingTableRow,
): number {
  if (b.points !== a.points) return b.points - a.points;
  const gdA = a.goalDifference ?? (a.goalsFor ?? 0) - (a.goalsAgainst ?? 0);
  const gdB = b.goalDifference ?? (b.goalsFor ?? 0) - (b.goalsAgainst ?? 0);
  if (gdB !== gdA) return gdB - gdA;
  if ((b.goalsFor ?? 0) !== (a.goalsFor ?? 0)) {
    return (b.goalsFor ?? 0) - (a.goalsFor ?? 0);
  }
  const idA = a.team?.id ?? 0;
  const idB = b.team?.id ?? 0;
  return idA - idB;
}

export function buildBestThirdPlacesRanking(
  standings: GroupStanding[],
): ThirdPlaceRankingEntry[] {
  const thirdPlaceRows: { group: GroupStanding; row: StandingTableRow }[] = [];

  for (const g of standings) {
    const rows = [...g.rows].sort(
      (a, b) => (a.position ?? 999) - (b.position ?? 999),
    );
    if (rows.length >= 3) {
      thirdPlaceRows.push({ group: g, row: rows[2]! });
    }
  }

  thirdPlaceRows.sort((a, b) => compareRowsForCrossGroupRanking(a.row, b.row));

  return thirdPlaceRows.map((entry, i) => ({
    rank: i + 1,
    qualifies: i < WC_BEST_THIRD_PLACES_COUNT,
    groupLetter: entry.group.letter,
    groupKey: entry.group.groupKey,
    row: entry.row,
  }));
}

export function getStandingsQualificationMarks(standings: GroupStanding[]): {
  directQualifyIds: Set<number>;
  thirdPlaceQualifyIds: Set<number>;
} {
  const directQualifyIds = new Set<number>();
  for (const g of standings) {
    const rows = [...g.rows].sort(
      (a, b) => (a.position ?? 999) - (b.position ?? 999),
    );
    for (let i = 0; i < Math.min(2, rows.length); i++) {
      const id = rows[i]?.team?.id;
      if (id !== undefined) directQualifyIds.add(id);
    }
  }

  const thirdPlaceQualifyIds = new Set<number>();
  for (const entry of buildBestThirdPlacesRanking(standings)) {
    if (!entry.qualifies) continue;
    const id = entry.row.team?.id;
    if (id !== undefined) thirdPlaceQualifyIds.add(id);
  }

  return { directQualifyIds, thirdPlaceQualifyIds };
}
