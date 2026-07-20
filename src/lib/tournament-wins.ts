import type { FootballDataMatch } from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import { filterMatchesForTournament } from "@/lib/wc-pred-display";

export type TournamentWinBadge = {
  tournamentId: string;
  tournamentName: string;
  awardedAt: Date;
};

/** Un meci nu mai poate schimba clasamentul doar dacă s-a jucat (sau a fost decis administrativ). */
function isMatchSettled(match: FootballDataMatch): boolean {
  return match.status === "FINISHED" || match.status === "AWARDED";
}

/**
 * Turneul e gata doar dacă are meciuri în fereastră ȘI toate s-au încheiat.
 * Zero meciuri = date lipsă din API, nu turneu terminat — altfel am acorda
 * badge-uri pe un clasament gol la prima eroare de fetch.
 */
export function isTournamentComplete(
  matches: FootballDataMatch[],
  tournament: { startMatchday: number | null; endMatchday: number | null },
): boolean {
  const inWindow = filterMatchesForTournament(matches, tournament);
  if (inWindow.length === 0) return false;
  return inWindow.every(isMatchSettled);
}

export type AwardTournamentWinResult = {
  /** Badge nou acordat (doar turnee publice). */
  awarded: boolean;
  /** Turneul tocmai a primit `closedAt` în această rulare. */
  justClosed: boolean;
};

/**
 * Marchează turneul închis când toate meciurile din fereastră s-au terminat.
 * Pentru turnee publice acordă și badge-ul de câștigător.
 * Idempotent: `@@unique([tournamentId])` + `closedAt` fac re-rularea cronului sigură.
 */
export async function awardTournamentWinIfComplete(
  tournament: {
    id: string;
    name: string;
    isPublic: boolean;
    closedAt: Date | null;
    startMatchday: number | null;
    endMatchday: number | null;
  },
  matches: FootballDataMatch[],
): Promise<AwardTournamentWinResult> {
  if (tournament.closedAt) return { awarded: false, justClosed: false };
  if (!isTournamentComplete(matches, tournament)) {
    return { awarded: false, justClosed: false };
  }

  // Scorurile au fost tocmai recalculate de refreshAllScores, deci cache-ul e proaspăt.
  const top = await prisma.tournamentMember.findFirst({
    where: { tournamentId: tournament.id },
    orderBy: [{ cachedTotal: "desc" }, { joinedAt: "asc" }],
  });

  let awarded = false;

  // Badge doar pe turnee publice cu scor > 0.
  if (tournament.isPublic && top && top.cachedTotal > 0) {
    try {
      await prisma.tournamentWin.create({
        data: {
          userId: top.userId,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          finalTotal: top.cachedTotal,
        },
      });
      awarded = true;
    } catch {
      // Deja acordat (unique pe tournamentId) — doar ne asigurăm că e marcat închis.
    }
  }

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
