import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { sendFinalRankingEmails } from "@/lib/email/send-jobs";
import { refreshAllScores } from "@/lib/global-leaderboard";
import { prisma } from "@/lib/prisma";
import { resolveTournamentCompetitionKeys } from "@/lib/tournament-competition";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Scoruri întâi (clasamente + închidere turnee), apoi cote.
 * Emailurile au cron separat: `/api/cron/email-digest` la 06:00 UTC.
 */
const ODDS_PHASE_BUDGET_MS = 210_000;
const CRON_HARD_LIMIT_MS = 290_000;

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

  const started = Date.now();

  let scores: { updated: number; errors: number } | null = null;
  let finalRank = null;
  try {
    const s = await refreshAllScores();
    scores = { updated: s.updated, errors: s.errors };
    revalidatePath("/turnee");
    revalidatePath("/turnee/clasament");
    if (s.newlyClosedTournamentIds.length > 0) {
      finalRank = await sendFinalRankingEmails(s.newlyClosedTournamentIds);
    }
  } catch (e) {
    console.error(
      "[cron/tournament-odds] refreshAllScores failed",
      e instanceof Error ? e.message : e,
    );
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

  const remaining = CRON_HARD_LIMIT_MS - (Date.now() - started);
  const oddsBudget = Math.min(ODDS_PHASE_BUDGET_MS, Math.max(0, remaining));
  const oddsDeadline = Date.now() + oddsBudget;
  let skipped = 0;

  for (const competition of competitions) {
    if (Date.now() > oddsDeadline) {
      skipped++;
      continue;
    }
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

  if (skipped > 0) {
    console.warn(
      `[cron/tournament-odds] ${skipped} competiții amânate (buget de timp); ` +
        `se reiau la rularea următoare.`,
    );
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    skipped,
    results,
    scores,
    finalRank,
  });
}
