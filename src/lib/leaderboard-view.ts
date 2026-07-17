/** Câți lideri arătăm mereu + câți vecini păstrăm în jurul propriului rând. */
export const LEADERBOARD_TOP_VISIBLE = 10;
export const LEADERBOARD_NEIGHBOR_CONTEXT = 1;

export type LeaderboardViewEntry<Row> =
  | { kind: "row"; row: Row }
  | { kind: "gap"; hiddenCount: number };

/** Sub acest prag restrângerea nu merită — arătăm tot clasamentul. */
export function canCollapseLeaderboard(rowCount: number): boolean {
  return rowCount > LEADERBOARD_TOP_VISIBLE + 2;
}

/**
 * În mod restrâns arătăm top-ul + un rând-punte + propriul rând cu vecinii lui,
 * ca userul să se vadă chiar dacă e pe locul 45. `showAll` deschide lista completă.
 * Rândurile trebuie să vină deja sortate după rank.
 */
export function buildLeaderboardView<Row extends { userId: string }>(
  rows: Row[],
  currentUserId: string,
  showAll: boolean,
): LeaderboardViewEntry<Row>[] {
  if (showAll || !canCollapseLeaderboard(rows.length)) {
    return rows.map((row) => ({ kind: "row", row }));
  }

  const view: LeaderboardViewEntry<Row>[] = rows
    .slice(0, LEADERBOARD_TOP_VISIBLE)
    .map((row) => ({ kind: "row", row }));

  const meIndex = rows.findIndex((r) => r.userId === currentUserId);

  // Userul e deja în top (sau nu e în acest clasament) → top + restul ascuns.
  if (meIndex < 0 || meIndex < LEADERBOARD_TOP_VISIBLE) {
    const hidden = rows.length - LEADERBOARD_TOP_VISIBLE;
    if (hidden > 0) view.push({ kind: "gap", hiddenCount: hidden });
    return view;
  }

  // Userul e sub top → punte, apoi el cu vecinii, apoi eventual restul.
  const start = Math.max(LEADERBOARD_TOP_VISIBLE, meIndex - LEADERBOARD_NEIGHBOR_CONTEXT);
  const end = Math.min(rows.length, meIndex + LEADERBOARD_NEIGHBOR_CONTEXT + 1);

  const hiddenBefore = start - LEADERBOARD_TOP_VISIBLE;
  if (hiddenBefore > 0) view.push({ kind: "gap", hiddenCount: hiddenBefore });

  for (const row of rows.slice(start, end)) view.push({ kind: "row", row });

  const hiddenAfter = rows.length - end;
  if (hiddenAfter > 0) view.push({ kind: "gap", hiddenCount: hiddenAfter });

  return view;
}
