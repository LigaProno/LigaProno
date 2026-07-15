/** Index (0-based) of public tournaments hidden from the UI. */
export const HIDDEN_PUBLIC_TOURNAMENT_SLOT = 1;

type PublicTournamentRef = { id: string; createdAt: Date };

export function orderPublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return [...tournaments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function getVisiblePublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return orderPublicTournaments(tournaments).filter(
    (_, index) => index !== HIDDEN_PUBLIC_TOURNAMENT_SLOT,
  );
}
