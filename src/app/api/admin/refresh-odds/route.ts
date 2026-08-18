import { NextRequest, NextResponse } from "next/server";
import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { prisma } from "@/lib/prisma";
import { resolveTournamentCompetitionKeys } from "@/lib/tournament-competition";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const competitionParam = url.searchParams.get("competition");

  let competitions: string[];

  if (competitionParam) {
    competitions = [competitionParam];
  } else {
    const tournaments = await prisma.tournament.findMany({
      select: { competition: true, competitions: true },
    });
    competitions = [
      ...new Set(tournaments.flatMap((t) => resolveTournamentCompetitionKeys(t))),
    ];
  }

  if (competitions.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Nu există competiții active de actualizat.",
      competitions: [],
    });
  }

  const results: {
    competition: string;
    ok: boolean;
    matchCount?: number;
    teamCount?: number;
    oddsSource?: string;
    error?: string;
  }[] = [];

  for (const competition of competitions) {
    const r = await refreshOddsForCompetition(competition);
    if (r.ok) {
      results.push({
        competition,
        ok: true,
        matchCount: r.matchCount,
        teamCount: r.teamCount,
        oddsSource: r.oddsSource,
      });
    } else {
      results.push({
        competition,
        ok: false,
        error: r.error,
      });
    }
  }

  const now = new Date();
  await Promise.all(
    results
      .filter((r) => r.ok)
      .map((r) =>
        prisma.competitionBettingOdds.updateMany({
          where: { competition: r.competition },
          data: { lastManualRefreshAt: now },
        }),
      ),
  );

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
