/** Index (0-based) of public tournaments hidden from the UI. */
export const HIDDEN_PUBLIC_TOURNAMENT_SLOT = 1;

type PublicTournamentRef = { id: string; createdAt: Date };

export function orderPublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return [...tournaments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function getPublicTournamentSlot(id: string, allPublic: PublicTournamentRef[]): number {
  return orderPublicTournaments(allPublic).findIndex((t) => t.id === id);
}

export function getVisiblePublicTournaments<T extends PublicTournamentRef>(tournaments: T[]): T[] {
  return orderPublicTournaments(tournaments).filter(
    (_, index) => index !== HIDDEN_PUBLIC_TOURNAMENT_SLOT,
  );
}

export type PublicTournamentDisplayKey = "tournament.page.publicContest1" | "tournament.page.publicContest2";

export function getPublicTournamentDisplayKey(slot: number): PublicTournamentDisplayKey | null {
  if (slot === 0) return "tournament.page.publicContest1";
  if (slot === 1) return "tournament.page.publicContest2";
  return null;
}

export function resolveTournamentDisplayName(
  tournament: { id: string; name: string; isPublic: boolean },
  allPublic: PublicTournamentRef[],
  translate: (key: PublicTournamentDisplayKey) => string,
): string {
  if (!tournament.isPublic) return tournament.name;
  const slot = getPublicTournamentSlot(tournament.id, allPublic);
  const key = getPublicTournamentDisplayKey(slot);
  return key ? translate(key) : tournament.name;
}

export async function fetchPublicTournamentsForNaming(): Promise<PublicTournamentRef[]> {
  const { prisma } = await import("@/lib/prisma");
  return prisma.tournament.findMany({
    where: { isPublic: true },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}
