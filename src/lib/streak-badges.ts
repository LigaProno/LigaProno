import { fetchCompetitionMatches, type FootballDataMatch } from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { filterMatchesForTournament } from "@/lib/wc-pred-display";
import { computeMatchPredictionHits, type MatchPredictionInput } from "@/lib/wc-scoring";

function isSettled(m: FootballDataMatch): boolean {
  return m.status === "FINISHED" || m.status === "AWARDED";
}

/** Sub acest prag nu arătăm badge. */
export const STREAK_BADGE_MIN = 2;

/**
 * Cel mai lung șir de scoruri exacte ghicite LA RÂND (strict) al fiecărui user,
 * luat din TOATE turneele publice. Reguli:
 *  - doar meciuri jucate (FINISHED/AWARDED), în ordine cronologică per turneu;
 *  - un meci greșit SAU nepronosticat rupe șirul (strict);
 *  - badge-ul = cel mai bun șir din orice turneu public (permanent — rezultatele
 *    trecute nu se schimbă, deci „best ever" e determinist).
 * Returnează doar userii cu șir ≥ STREAK_BADGE_MIN.
 */
export async function loadStreakBadgesByUser(
  userIds: string[],
): Promise<Map<string, number>> {
  const best = new Map<string, number>();
  if (userIds.length === 0) return best;

  const publicTournaments = await prisma.tournament.findMany({
    where: { isPublic: true, competition: { not: null } },
    select: { id: true, competition: true, startMatchday: true, endMatchday: true },
  });
  if (publicTournaments.length === 0) return best;

  const preds = await prisma.wcMatchPrediction.findMany({
    where: {
      tournamentId: { in: publicTournaments.map((t) => t.id) },
      userId: { in: userIds },
    },
  });

  // tournamentId → userId → matchId → pred
  const byTournamentUser = new Map<string, Map<string, Map<number, MatchPredictionInput>>>();
  for (const p of preds) {
    let byUser = byTournamentUser.get(p.tournamentId);
    if (!byUser) {
      byUser = new Map();
      byTournamentUser.set(p.tournamentId, byUser);
    }
    let byMatch = byUser.get(p.userId);
    if (!byMatch) {
      byMatch = new Map();
      byUser.set(p.userId, byMatch);
    }
    byMatch.set(p.matchId, {
      htOutcome: p.htOutcome,
      ftOutcome: p.ftOutcome,
      predHomeGoals: p.predHomeGoals,
      predAwayGoals: p.predAwayGoals,
    });
  }

  // Meciuri per competiție (cache partajat), o singură dată per competiție.
  const matchesByCompetition = new Map<string, FootballDataMatch[]>();
  for (const t of publicTournaments) {
    if (!t.competition || matchesByCompetition.has(t.competition)) continue;
    const parsed = parseStoredCompetition(t.competition);
    if (!parsed) continue;
    try {
      matchesByCompetition.set(
        t.competition,
        await fetchCompetitionMatches(parsed.code, parsed.season),
      );
    } catch {
      matchesByCompetition.set(t.competition, []);
    }
  }

  for (const t of publicTournaments) {
    if (!t.competition) continue;
    const settled = filterMatchesForTournament(matchesByCompetition.get(t.competition) ?? [], t)
      .filter(isSettled)
      .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
    if (settled.length === 0) continue;

    const byUser = byTournamentUser.get(t.id);
    if (!byUser) continue;

    for (const [userId, byMatch] of byUser) {
      let run = 0;
      let maxRun = 0;
      for (const m of settled) {
        const pred = byMatch.get(m.id);
        const correct = pred ? computeMatchPredictionHits(pred, m).scoreCorrect : false;
        if (correct) {
          run += 1;
          if (run > maxRun) maxRun = run;
        } else {
          run = 0;
        }
      }
      if (maxRun >= STREAK_BADGE_MIN) {
        const prev = best.get(userId) ?? 0;
        if (maxRun > prev) best.set(userId, maxRun);
      }
    }
  }

  return best;
}
