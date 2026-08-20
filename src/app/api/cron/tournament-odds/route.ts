import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { refreshAllScores } from "@/lib/global-leaderboard";
import { prisma } from "@/lib/prisma";
import { resolveTournamentCompetitionKeys } from "@/lib/tournament-competition";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournaments = await prisma.tournament.findMany({
    select: { competition: true, competitions: true },
  });

  const competitions = [
    ...new Set(tournaments.flatMap((t) => resolveTournamentCompetitionKeys(t))),
  ];

  const existingOdds = await prisma.competitionBettingOdds.findMany({
    where: { competition: { in: competitions } },
    select: { competition: true, fetchedAt: true },
  });
  const fetchedAtByKey = new Map(
    existingOdds.map((row) => [row.competition, row.fetchedAt.getTime()]),
  );
  competitions.sort((a, b) => (fetchedAtByKey.get(a) ?? 0) - (fetchedAtByKey.get(b) ?? 0));

  const results: {
    competition: string;
    ok: boolean;
    matchCount?: number;
    error?: string;
  }[] = [];

  for (const competition of competitions) {
    const r = await refreshOddsForCompetition(competition);
    if (r.ok) {
      results.push({
        competition,
        ok: true,
        matchCount: r.matchCount,
      });
    } else {
      results.push({
        competition,
        ok: false,
        error: r.error,
      });
    }
  }

  const oddsResults = results;
  let scores: { updated: number; errors: number } | null = null;
  try {
    const s = await refreshAllScores();
    scores = { updated: s.updated, errors: s.errors };
    revalidatePath("/turnee");
    revalidatePath("/turnee/clasament");
  } catch (e) {
    console.error(
      "[cron/tournament-odds] refreshAllScores failed",
      e instanceof Error ? e.message : e,
    );
  }

  return NextResponse.json({
    ok: true,
    processed: oddsResults.length,
    succeeded: oddsResults.filter((r) => r.ok).length,
    results: oddsResults,
    scores,
  });
}
