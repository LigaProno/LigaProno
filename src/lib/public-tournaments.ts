type PublicTournamentRef = { id: string; createdAt: Date };

export function orderPublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return [...tournaments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** Toate turneele publice, în ordinea creării. */
export function getVisiblePublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return orderPublicTournaments(tournaments);
}
