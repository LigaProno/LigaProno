import { NextRequest, NextResponse } from "next/server";
import { isLiga1Storage } from "@/lib/competition";
import { refreshOddsForTournament } from "@/lib/refresh-tournament-odds";
import { prisma } from "@/lib/prisma";

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
    where: {
      competition: { not: null },
    },
    select: { id: true, competition: true, name: true },
  });

  const footballDataTournaments = tournaments.filter(
    (t) => t.competition && !isLiga1Storage(t.competition),
  );

  const results: {
    tournamentId: string;
    name: string;
    ok: boolean;
    matchCount?: number;
    error?: string;
  }[] = [];

  for (const t of footballDataTournaments) {
    const r = await refreshOddsForTournament(t.id);
    if (r.ok) {
      results.push({
        tournamentId: t.id,
        name: t.name,
        ok: true,
        matchCount: r.matchCount,
      });
    } else {
      results.push({
        tournamentId: t.id,
        name: t.name,
        ok: false,
        error: r.error,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    results,
  });
}
