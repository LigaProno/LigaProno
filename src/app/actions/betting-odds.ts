"use server";

import { prisma } from "@/lib/prisma";
import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { requireDbUser } from "@/lib/sync-clerk-user";
import { canManualRefreshOddsToday } from "@/lib/odds-refresh-limit";
import { I18nError } from "@/lib/i18n/errors";
import { resolveTournamentCompetitionKeys } from "@/lib/tournament-competition";
import { loadTournamentOddsSnapshot } from "@/lib/competition-odds";
import { canMonitorTournaments } from "@/lib/admin";

export async function refreshTournamentBettingOdds(
  tournamentId: string,
): Promise<{
  ok: true;
  matchCount: number;
  teamCount: number;
  oddsSource: string;
  usedFallback: boolean;
}> {
  const user = await requireDbUser();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new I18nError("errors.tournamentNotFound");
  
  const isCreatorOrAdmin = tournament.creatorId === user.id || canMonitorTournaments(user.email);
  if (!isCreatorOrAdmin) {
    throw new I18nError("errors.onlyCreatorOdds");
  }

  const keys = resolveTournamentCompetitionKeys(tournament);
  if (keys.length === 0) {
    throw new I18nError("errors.competitionRequiredForOdds");
  }

  const oddsSnapshot = await loadTournamentOddsSnapshot(keys);
  if (!canManualRefreshOddsToday(oddsSnapshot?.lastManualRefreshAt ?? null)) {
    throw new I18nError("errors.oddsOncePerDay");
  }

  let matchCount = 0;
  let teamCount = 0;
  let oddsSource = "";
  let usedFallback = false;
  const succeeded: string[] = [];
  const errors: string[] = [];

  for (const key of keys) {
    const result = await refreshOddsForCompetition(key);
    if (!result.ok) {
      errors.push(`${key}: ${result.error}`);
      continue;
    }
    succeeded.push(key);
    matchCount += result.matchCount;
    teamCount += result.teamCount;
    oddsSource = result.oddsSource;
    usedFallback = usedFallback || result.usedFallback;
  }

  if (succeeded.length === 0) {
    throw new Error(errors.join("; ") || "Nu s-au putut actualiza cotele.");
  }

  // Limităm refresh-ul manual doar dacă toate competițiile au reușit —
  // altfel se poate reîncerca pentru ligile care au picat (ex. Serie A).
  if (errors.length === 0) {
    const now = new Date();
    await Promise.all(
      succeeded.map((competition) =>
        prisma.competitionBettingOdds.updateMany({
          where: { competition },
          data: { lastManualRefreshAt: now },
        }),
      ),
    );
  }

  return {
    ok: true,
    matchCount,
    teamCount,
    oddsSource,
    usedFallback,
  };
}
