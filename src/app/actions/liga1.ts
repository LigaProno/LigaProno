"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseStoredCompetition, isLiga1Storage } from "@/lib/competition";
import { fetchLiga1FixturesViaGemini, fetchLiga1OddsViaGemini, fetchLiga1ResultsViaGemini } from "@/lib/gemini-liga1";
import { sanitizeBettingPayload, type BettingOddsPayload } from "@/lib/betting-odds";
import { isLiga1CompetitionUnderway } from "@/lib/liga1-scoring";
import { outcomeFromScores } from "@/lib/wc-scoring";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function requireUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");
  return user;
}

async function requireCreator(tournamentId: string, userId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new Error("Tournament not found.");
  if (tournament.creatorId !== userId) throw new Error("Only the creator can do this.");
  return tournament;
}

// ---------------------------------------------------------------------------
// Init fixtures
// ---------------------------------------------------------------------------

export async function initLiga1Fixtures(
  tournamentId: string,
): Promise<{ fixtureCount: number; teamCount: number }> {
  const user = await requireUser();
  const tournament = await requireCreator(tournamentId, user.id);

  if (!isLiga1Storage(tournament.competition)) {
    throw new Error("This party is not a Liga 1 competition.");
  }

  const parsed = parseStoredCompetition(tournament.competition);
  if (!parsed) throw new Error("Invalid competition storage.");

  // Fetch only today's fixtures — fast, no Google Search needed
  const { teams, fixtures } = await fetchLiga1FixturesViaGemini(parsed.season, new Date());

  if (fixtures.length === 0) throw new Error("Gemini returned no fixtures. Try again.");

  const teamById = new Map(teams.map((t) => [t.id, t]));

  const HT_OFFSET_MS = 55 * 60 * 1000;
  const FT_OFFSET_MS = 115 * 60 * 1000;

  const data = fixtures.map((f) => {
    const kickoff = new Date(f.utcDate);
    return {
      tournamentId,
      internalMatchId: f.matchId,
      matchday: f.matchday,
      homeTeamId: f.homeTeamId,
      homeTeamName: teamById.get(f.homeTeamId)?.name ?? `Team ${f.homeTeamId}`,
      awayTeamId: f.awayTeamId,
      awayTeamName: teamById.get(f.awayTeamId)?.name ?? `Team ${f.awayTeamId}`,
      utcDate: kickoff,
      htFetchAt: new Date(kickoff.getTime() + HT_OFFSET_MS),
      ftFetchAt: new Date(kickoff.getTime() + FT_OFFSET_MS),
    };
  });

  // Upsert so re-running "Load Today's Fixtures" doesn't duplicate
  for (const row of data) {
    await prisma.liga1Fixture.upsert({
      where: { tournamentId_internalMatchId: { tournamentId, internalMatchId: row.internalMatchId } },
      create: row,
      update: { matchday: row.matchday, homeTeamName: row.homeTeamName, awayTeamName: row.awayTeamName, utcDate: row.utcDate, htFetchAt: row.htFetchAt, ftFetchAt: row.ftFetchAt },
    });
  }

  revalidatePath(`/party/${tournamentId}`);
  return { fixtureCount: fixtures.length, teamCount: teams.length };
}

export async function resetLiga1Fixtures(tournamentId: string): Promise<void> {
  const user = await requireUser();
  await requireCreator(tournamentId, user.id);
  await prisma.liga1Fixture.deleteMany({ where: { tournamentId } });
  revalidatePath(`/party/${tournamentId}`);
}

// ---------------------------------------------------------------------------
// Odds refresh (Liga1-specific)
// ---------------------------------------------------------------------------

export async function refreshLiga1BettingOdds(
  tournamentId: string,
): Promise<{ ok: true; matchCount: number; teamCount: number; model: string }> {
  const user = await requireUser();
  await requireCreator(tournamentId, user.id);

  const fixtures = await prisma.liga1Fixture.findMany({ where: { tournamentId } });
  if (fixtures.length === 0) {
    throw new Error("Initialise fixtures first before refreshing odds.");
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  const parsed = parseStoredCompetition(tournament?.competition ?? null);
  if (!parsed) throw new Error("Invalid competition.");

  // Collect unique teams from fixtures
  const teamMap = new Map<number, string>();
  for (const f of fixtures) {
    teamMap.set(f.homeTeamId, f.homeTeamName);
    teamMap.set(f.awayTeamId, f.awayTeamName);
  }
  const teams = Array.from(teamMap, ([id, name]) => ({
    id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
  }));

  const fixturesSimple = fixtures.map((f) => ({
    matchId: f.internalMatchId,
    matchday: f.matchday,
    homeTeamId: f.homeTeamId,
    homeTeamName: f.homeTeamName,
    awayTeamId: f.awayTeamId,
    awayTeamName: f.awayTeamName,
    utcDate: f.utcDate.toISOString(),
  }));

  const { payload: rawPayload, model } = await fetchLiga1OddsViaGemini(
    teams,
    fixturesSimple,
    parsed.season,
  );
  const payload: BettingOddsPayload = sanitizeBettingPayload(rawPayload);

  await prisma.tournamentBettingOdds.upsert({
    where: { tournamentId },
    create: { tournamentId, payload: payload as object, geminiModel: model },
    update: { payload: payload as object, geminiModel: model, fetchedAt: new Date() },
  });

  revalidatePath(`/party/${tournamentId}`);

  return {
    ok: true,
    matchCount: Object.keys(payload.matches).length,
    teamCount: Object.keys(payload.teams).length,
    model,
  };
}

// ---------------------------------------------------------------------------
// Save match prediction (per-match lock: blocks after individual kickoff)
// ---------------------------------------------------------------------------

function validOutcome(v: unknown): v is "HOME" | "AWAY" | "DRAW" {
  return v === "HOME" || v === "AWAY" || v === "DRAW";
}

export async function saveLiga1MatchPrediction(
  tournamentId: string,
  internalMatchId: number,
  input: {
    htOutcome?: string | null;
    ftOutcome?: string | null;
    predHomeGoals?: number | null;
    predAwayGoals?: number | null;
  },
): Promise<void> {
  const user = await requireUser();

  const [tournament, fixture, member] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    prisma.liga1Fixture.findFirst({ where: { tournamentId, internalMatchId } }),
    prisma.tournamentMember.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
    }),
  ]);

  if (!tournament) throw new Error("Tournament not found.");
  if (!fixture) throw new Error("Fixture not found.");
  if (!member) throw new Error("You are not a member of this party.");

  const now = new Date();
  const kickoff = new Date(fixture.utcDate);
  const matchStarted = now >= kickoff || ["IN_PLAY", "PAUSED", "FINISHED"].includes(fixture.status);

  if (matchStarted && !tournament.allowPredictionChangesDuringCompetition) {
    throw new Error("This match has already started. Predictions are locked.");
  }

  const htOutcome =
    validOutcome(input.htOutcome) ? input.htOutcome : null;
  const ftOutcome =
    validOutcome(input.ftOutcome) ? input.ftOutcome : null;
  const predHomeGoals =
    input.predHomeGoals != null && Number.isInteger(input.predHomeGoals) && input.predHomeGoals >= 0
      ? input.predHomeGoals
      : null;
  const predAwayGoals =
    input.predAwayGoals != null && Number.isInteger(input.predAwayGoals) && input.predAwayGoals >= 0
      ? input.predAwayGoals
      : null;

  const existing = await prisma.wcMatchPrediction.findFirst({
    where: { tournamentId, userId: user.id, matchId: internalMatchId },
  });

  let changed = false;
  if (existing) {
    changed =
      existing.htOutcome !== htOutcome ||
      existing.ftOutcome !== ftOutcome ||
      existing.predHomeGoals !== predHomeGoals ||
      existing.predAwayGoals !== predAwayGoals;

    await prisma.wcMatchPrediction.update({
      where: { id: existing.id },
      data: { htOutcome, ftOutcome, predHomeGoals, predAwayGoals },
    });
  } else {
    await prisma.wcMatchPrediction.create({
      data: { tournamentId, userId: user.id, matchId: internalMatchId, htOutcome, ftOutcome, predHomeGoals, predAwayGoals },
    });
    changed = true;
  }

  if (changed && matchStarted && tournament.allowPredictionChangesDuringCompetition) {
    await prisma.tournamentMember.update({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
      data: { midCompetitionPredictionChangeCount: { increment: 1 } },
    });
  }

  revalidatePath(`/party/${tournamentId}`);
}

// ---------------------------------------------------------------------------
// Save extra prediction (top 4 + champion)
// ---------------------------------------------------------------------------

export async function saveLiga1ExtraPrediction(
  tournamentId: string,
  top4TeamIds: number[],
  championTeamId: number | null,
): Promise<void> {
  const user = await requireUser();

  const [tournament, member, fixtures] = await Promise.all([
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
    prisma.tournamentMember.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
    }),
    prisma.liga1Fixture.findMany({ where: { tournamentId }, select: { utcDate: true, status: true } }),
  ]);

  if (!tournament) throw new Error("Tournament not found.");
  if (!member) throw new Error("You are not a member of this party.");

  const underway = isLiga1CompetitionUnderway(
    fixtures.map((f) => ({ status: f.status, utcDate: f.utcDate })),
  );

  if (underway && !tournament.allowPredictionChangesDuringCompetition) {
    throw new Error("Competition has started. Extra predictions are locked.");
  }

  // Validate: max 4 unique team IDs
  const unique = [...new Set(top4TeamIds.filter((id) => Number.isFinite(id)))].slice(0, 4);

  const existing = await prisma.wcExtraPrediction.findFirst({
    where: { tournamentId, userId: user.id },
  });

  let changed = false;
  if (existing) {
    const same =
      JSON.stringify([...existing.advancingTeamIds].sort()) === JSON.stringify([...unique].sort()) &&
      existing.championTeamId === championTeamId;
    changed = !same;
    await prisma.wcExtraPrediction.update({
      where: { id: existing.id },
      data: { advancingTeamIds: unique, championTeamId },
    });
  } else {
    await prisma.wcExtraPrediction.create({
      data: { tournamentId, userId: user.id, advancingTeamIds: unique, championTeamId },
    });
    changed = true;
  }

  if (changed && underway && tournament.allowPredictionChangesDuringCompetition) {
    await prisma.tournamentMember.update({
      where: { tournamentId_userId: { tournamentId, userId: user.id } },
      data: { midCompetitionPredictionChangeCount: { increment: 1 } },
    });
  }

  revalidatePath(`/party/${tournamentId}`);
}

// ---------------------------------------------------------------------------
// Manual result fetch (admin button — fetches HT + FT for all non-finished fixtures)
// ---------------------------------------------------------------------------

export async function fetchLiga1ResultsNow(
  tournamentId: string,
): Promise<{ updated: number; pending: number }> {
  const user = await requireUser();
  await requireCreator(tournamentId, user.id);

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  const parsed = parseStoredCompetition(tournament?.competition ?? null);
  if (!parsed) throw new Error("Invalid competition.");

  const now = new Date();

  const fixtures = await prisma.liga1Fixture.findMany({
    where: { tournamentId, status: { not: "FINISHED" }, utcDate: { lte: now } },
  });

  if (fixtures.length === 0) throw new Error("No started fixtures to fetch results for yet.");

  const toFetch = fixtures.map((f) => ({
    matchId: f.internalMatchId,
    matchday: f.matchday,
    homeTeamName: f.homeTeamName,
    awayTeamName: f.awayTeamName,
    utcDate: f.utcDate.toISOString(),
    needHt: f.htHome == null,
    needFt: f.ftHome == null,
  }));

  const results = await fetchLiga1ResultsViaGemini(toFetch, parsed.season);
  const resultMap = new Map(results.map((r) => [r.matchId, r]));

  let updated = 0;
  let pending = 0;

  for (const fixture of fixtures) {
    const result = resultMap.get(fixture.internalMatchId);
    if (!result) continue;

    if (!result.confident) {
      await prisma.liga1Fixture.update({
        where: { id: fixture.id },
        data: { status: "PENDING", geminiConfident: false },
      });
      pending++;
      continue;
    }

    const patch: Record<string, unknown> = { geminiConfident: true };
    if (result.htHome != null && result.htAway != null) {
      patch.htHome = result.htHome;
      patch.htAway = result.htAway;
    }
    if (result.ftHome != null && result.ftAway != null) {
      patch.ftHome = result.ftHome;
      patch.ftAway = result.ftAway;
      patch.status = "FINISHED";
    } else if (result.status === "IN_PLAY") {
      patch.status = "IN_PLAY";
    } else if (result.status === "PAUSED") {
      patch.status = "PAUSED";
    }

    await prisma.liga1Fixture.update({ where: { id: fixture.id }, data: patch });
    updated++;
  }

  revalidatePath(`/party/${tournamentId}`);
  return { updated, pending };
}
