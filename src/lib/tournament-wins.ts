import type { FootballDataMatch } from "@/lib/football-data-types";
import { prisma } from "@/lib/prisma";
import { filterMatchesForTournament } from "@/lib/wc-pred-display";
import { isMatchSettled, isMatchVoidForTournament } from "@/lib/match-status";

export type TournamentWinBadge = {
  tournamentId: string;
  tournamentName: string;
  awardedAt: Date;
};

/**
 * Turneul e gata doar dacă are meciuri în fereastră ȘI fiecare e terminat sau anulat.
 * Amânările țin turneul deschis. Zero meciuri = date lipsă din API, nu turneu terminat.
 */
export function isTournamentComplete(
  matches: FootballDataMatch[],
  tournament: {
    startMatchday: number | null;
    endMatchday: number | null;
    selectedMatchIds?: number[] | null;
  },
): boolean {
  const inWindow = filterMatchesForTournament(matches, tournament);
  if (inWindow.length === 0) return false;
  return inWindow.every(
    (m) => isMatchSettled(m) || isMatchVoidForTournament(m),
  );
}

export type AwardTournamentWinResult = {
  /** Badge nou acordat (doar turnee publice). */
  awarded: boolean;
  /** Turneul tocmai a primit `closedAt` în această rulare. */
  justClosed: boolean;
};

async function tryAwardPublicWinner(tournament: {
  id: string;
  name: string;
  isPublic: boolean;
}): Promise<boolean> {
  if (!tournament.isPublic) return false;

  const existing = await prisma.tournamentWin.findUnique({
    where: { tournamentId: tournament.id },
  });
  if (existing) return false;

  const top = await prisma.tournamentMember.findFirst({
    where: { tournamentId: tournament.id },
    orderBy: [{ cachedTotal: "desc" }, { joinedAt: "asc" }],
  });
  if (!top) return false;

  try {
    await prisma.tournamentWin.create({
      data: {
        userId: top.userId,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        finalTotal: top.cachedTotal,
      },
    });
    return true;
  } catch {
    // Cursă pe unique(tournamentId) — alt worker a acordat deja.
    return false;
  }
}

/**
 * Marchează turneul închis când toate meciurile din fereastră s-au terminat.
 * Pentru turnee publice acordă badge-ul de câștigător.
 *
 * Dacă turneul e deja închis dar badge-ul lipsește (scor 0 la închidere, eroare
 * cron), îl acordă retroactiv — fără a retrimite emailul de clasament final.
 */
export async function awardTournamentWinIfComplete(
  tournament: {
    id: string;
    name: string;
    isPublic: boolean;
    closedAt: Date | null;
    startMatchday: number | null;
    endMatchday: number | null;
    selectedMatchIds?: number[] | null;
  },
  matches: FootballDataMatch[],
): Promise<AwardTournamentWinResult> {
  if (tournament.closedAt) {
    const awarded = await tryAwardPublicWinner(tournament);
    return { awarded, justClosed: false };
  }

  if (!isTournamentComplete(matches, tournament)) {
    return { awarded: false, justClosed: false };
  }

  const awarded = await tryAwardPublicWinner(tournament);

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { closedAt: new Date() },
  });

  return { awarded, justClosed: true };
}

/** Badge-urile fiecărui user dintr-o listă — o singură interogare pentru tot clasamentul. */
export async function loadWinBadgesByUser(
  userIds: string[],
): Promise<Map<string, TournamentWinBadge[]>> {
  const byUser = new Map<string, TournamentWinBadge[]>();
  if (userIds.length === 0) return byUser;

  const wins = await prisma.tournamentWin.findMany({
    where: { userId: { in: userIds } },
    orderBy: { awardedAt: "desc" },
  });

  for (const w of wins) {
    const list = byUser.get(w.userId) ?? [];
    list.push({
      tournamentId: w.tournamentId,
      tournamentName: w.tournamentName,
      awardedAt: w.awardedAt,
    });
    byUser.set(w.userId, list);
  }

  return byUser;
}
