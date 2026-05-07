"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildTeamIdToGroupKeyFromStandings,
  fetchWorldCupGroupStandings,
  fetchWorldCupMatchesFootballData,
} from "@/lib/football-data";
import { COMPETITION_WC_2026 } from "@/lib/wc-scoring";

function validOutcome(v: unknown): v is "HOME" | "AWAY" | "DRAW" | "" {
  return v === "HOME" || v === "AWAY" || v === "DRAW" || v === "";
}

export async function setTournamentCompetition(
  tournamentId: string,
  competition: string | null,
): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Party not found.");
  if (tournament.creatorId !== user.id) {
    throw new Error("Only the party creator can change the competition.");
  }

  const next =
    competition === COMPETITION_WC_2026 ? COMPETITION_WC_2026 : null;

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { competition: next },
  });

  revalidatePath("/party");
  revalidatePath(`/party/${tournamentId}`);
}

async function assertMember(tournamentId: string, userId: string) {
  const m = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  if (!m) throw new Error("You are not a member of this party.");
}

export async function saveWcMatchPrediction(
  tournamentId: string,
  matchId: number,
  input: {
    htOutcome?: string | null;
    ftOutcome?: string | null;
    predHomeGoals?: number | null;
    predAwayGoals?: number | null;
  },
): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (tournament?.competition !== COMPETITION_WC_2026) {
    throw new Error("This party does not have FIFA World Cup 2026 enabled.");
  }

  await assertMember(tournamentId, user.id);

  const ht =
    input.htOutcome != null && input.htOutcome !== "" ?
      input.htOutcome
    : null;
  const ft =
    input.ftOutcome != null && input.ftOutcome !== "" ?
      input.ftOutcome
    : null;

  if (ht !== null && !validOutcome(ht)) throw new Error("Invalid half-time outcome.");
  if (ft !== null && !validOutcome(ft)) throw new Error("Invalid full-time outcome.");

  let predHomeGoals =
    input.predHomeGoals !== undefined && input.predHomeGoals !== null ?
      Number(input.predHomeGoals)
    : null;
  let predAwayGoals =
    input.predAwayGoals !== undefined && input.predAwayGoals !== null ?
      Number(input.predAwayGoals)
    : null;

  if (predHomeGoals !== null && (Number.isNaN(predHomeGoals) || predHomeGoals < 0)) {
    predHomeGoals = null;
  }
  if (predAwayGoals !== null && (Number.isNaN(predAwayGoals) || predAwayGoals < 0)) {
    predAwayGoals = null;
  }

  await prisma.wcMatchPrediction.upsert({
    where: {
      tournamentId_userId_matchId: {
        tournamentId,
        userId: user.id,
        matchId,
      },
    },
    create: {
      tournamentId,
      userId: user.id,
      matchId,
      htOutcome: ht,
      ftOutcome: ft,
      predHomeGoals,
      predAwayGoals,
    },
    update: {
      htOutcome: ht,
      ftOutcome: ft,
      predHomeGoals,
      predAwayGoals,
    },
  });

  revalidatePath(`/party/${tournamentId}`);
}

export async function saveWcExtraPrediction(
  tournamentId: string,
  advancingTeamIds: number[],
  championTeamId: number | null,
): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (tournament?.competition !== COMPETITION_WC_2026) {
    throw new Error("This party does not have FIFA World Cup 2026 enabled.");
  }

  await assertMember(tournamentId, user.id);

  const seen = new Set<number>();
  const clean: number[] = [];
  for (const id of advancingTeamIds) {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    clean.push(n);
  }

  let teamToGroup = new Map<number, string>();
  try {
    const matches = await fetchWorldCupMatchesFootballData();
    const standings = await fetchWorldCupGroupStandings(matches);
    teamToGroup = buildTeamIdToGroupKeyFromStandings(standings);
  } catch {
    /* If WC data is unavailable, skip server-side per-group cap. */
  }
  if (teamToGroup.size > 0) {
    const perGroup = new Map<string, number>();
    for (const id of clean) {
      const gk = teamToGroup.get(id);
      if (!gk) continue;
      perGroup.set(gk, (perGroup.get(gk) ?? 0) + 1);
    }
    for (const c of perGroup.values()) {
      if (c > 3) {
        throw new Error("You can save at most 3 teams from the same group.");
      }
    }
  }

  const champ =
    championTeamId != null &&
    Number.isInteger(championTeamId) &&
    championTeamId > 0 ?
      championTeamId
    : null;

  await prisma.wcExtraPrediction.upsert({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
    create: {
      tournamentId,
      userId: user.id,
      advancingTeamIds: clean,
      championTeamId: champ,
    },
    update: {
      advancingTeamIds: clean,
      championTeamId: champ,
    },
  });

  revalidatePath(`/party/${tournamentId}`);
}
