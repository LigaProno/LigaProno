type PublicTournamentRef = { id: string; createdAt: Date };

/** Câte turnee publice încheiate apar înainte de „Vezi mai multe”. */
export const FINISHED_PUBLIC_PREVIEW_COUNT = 3;

/** Cele mai recent închise primele. */
export const finishedPublicListOrder = [
  { closedAt: "desc" as const },
  { createdAt: "desc" as const },
];

export type FinishedPublicCardData = {
  id: string;
  name: string;
  memberCount: number;
  prizesRaw: unknown;
  isJoined: boolean;
  prizePool: string[];
};

export function toFinishedPublicCard(
  tournament: {
    id: string;
    name: string;
    prizes: unknown;
    prizePool: string[];
    _count: { members: number };
  },
  joinedIds: ReadonlySet<string>,
): FinishedPublicCardData {
  return {
    id: tournament.id,
    name: tournament.name,
    memberCount: tournament._count.members,
    prizesRaw: tournament.prizes,
    isJoined: joinedIds.has(tournament.id),
    prizePool: tournament.prizePool,
  };
}

export function orderPublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return [...tournaments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

/** Toate turneele publice, în ordinea creării. */
export function getVisiblePublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return orderPublicTournaments(tournaments);
}
