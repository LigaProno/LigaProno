"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildTeamIdToGroupKeyFromStandings,
  collectTeamsFromMatches,
  fetchCompetitionMatches,
  fetchPartyStandings,
  getFootballDataCompetitionPickerOptions,
} from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import { outcomeFromScores } from "@/lib/wc-scoring";

function validOutcome(v: unknown): v is "HOME" | "AWAY" | "DRAW" | "" {
  return v === "HOME" || v === "AWAY" || v === "DRAW" || v === "";
}

async function assertCompetitionPickerValue(storageKey: string): Promise<string> {
  const t = storageKey.trim();
  const opts = await getFootballDataCompetitionPickerOptions();
  if (!opts.some((o) => o.storageKey === t)) {
    throw new Error("Invalid competition selection.");
  }
  return t;
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
    competition == null || competition.trim() === "" ?
      null
    : await assertCompetitionPickerValue(competition);

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
  if (!parseStoredCompetition(tournament?.competition ?? null)) {
    throw new Error("This party has no competition enabled for predictions.");
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
  const parsed = parseStoredCompetition(tournament?.competition ?? null);
  if (!parsed) {
    throw new Error("This party has no competition enabled for predictions.");
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
    const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
    const standings = await fetchPartyStandings(
      parsed.code,
      parsed.season,
      matches,
    );
    teamToGroup = buildTeamIdToGroupKeyFromStandings(standings);
  } catch {
    /* If fixture data is unavailable, skip server-side per-group cap. */
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

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function randInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1));
}

/**
 * Doar în development: umple pronosticuri aleatoare (meciuri + extras) pentru
 * utilizatorul curent, când party-ul e pe Champions League (cod API `CL`).
 */
export async function simulateRandomClPredictionsForMe(
  tournamentId: string,
): Promise<{ matchCount: number; advancingCount: number }> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Simulator is only available in development.");
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  const parsed = parseStoredCompetition(tournament?.competition ?? null);
  if (!parsed) {
    throw new Error("This party has no competition enabled.");
  }
  if (parsed.code !== "CL") {
    throw new Error(
      "This simulator only works when the party competition is Champions League (CL).",
    );
  }

  await assertMember(tournamentId, user.id);

  const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
  if (matches.length === 0) {
    throw new Error("No matches returned for this Champions League season.");
  }

  const standings = await fetchPartyStandings(
    parsed.code,
    parsed.season,
    matches,
  );

  for (const m of matches) {
    const predHomeGoals = randInt(4);
    const predAwayGoals = randInt(4);
    const htH = randInt(3);
    const htA = randInt(3);
    const ft = outcomeFromScores(predHomeGoals, predAwayGoals);
    const ht = outcomeFromScores(htH, htA);

    await prisma.wcMatchPrediction.upsert({
      where: {
        tournamentId_userId_matchId: {
          tournamentId,
          userId: user.id,
          matchId: m.id,
        },
      },
      create: {
        tournamentId,
        userId: user.id,
        matchId: m.id,
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
  }

  const advancing: number[] = [];
  const seen = new Set<number>();
  for (const g of standings) {
    const ids = g.rows
      .map((r) => r.team?.id)
      .filter((id): id is number => id != null);
    shuffleInPlace(ids);
    const cap = Math.min(3, Math.max(1, ids.length));
    const n = ids.length === 0 ? 0 : 1 + randInt(cap - 1);
    for (let i = 0; i < n && i < ids.length; i++) {
      const id = ids[i]!;
      if (!seen.has(id)) {
        seen.add(id);
        advancing.push(id);
      }
    }
  }

  const teams = collectTeamsFromMatches(matches).filter((t) => t.id != null);
  const championTeamId =
    teams.length > 0 ? teams[randInt(teams.length - 1)]!.id! : null;

  await prisma.wcExtraPrediction.upsert({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
    create: {
      tournamentId,
      userId: user.id,
      advancingTeamIds: advancing,
      championTeamId,
    },
    update: {
      advancingTeamIds: advancing,
      championTeamId,
    },
  });

  revalidatePath("/party");
  revalidatePath(`/party/${tournamentId}`);
  revalidatePath(`/party/${tournamentId}/member/${user.id}`);

  return { matchCount: matches.length, advancingCount: advancing.length };
}
