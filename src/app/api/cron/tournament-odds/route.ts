import { NextRequest, NextResponse } from "next/server";
import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
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
    select: { competition: true },
  });

  const competitions = [
    ...new Set(
      tournaments
        .map((t) => t.competition)
        .filter((c): c is string => typeof c === "string" && c.length > 0),
    ),
  ];

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

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    results,
  });
}
