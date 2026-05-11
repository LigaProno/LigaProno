import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseStoredCompetition, isLiga1Storage } from "@/lib/competition";
import { fetchLiga1ResultsViaGemini } from "@/lib/gemini-liga1";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isCronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: no secret configured
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all active Liga1 tournaments
  const tournaments = await prisma.tournament.findMany({
    where: { competition: { startsWith: "PDL1" } },
    select: { id: true, competition: true },
  });

  if (tournaments.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let totalUpdated = 0;

  for (const tournament of tournaments) {
    const parsed = parseStoredCompetition(tournament.competition);
    if (!parsed || !isLiga1Storage(tournament.competition)) continue;

    // Find fixtures that need HT or FT fetching
    const pending = await prisma.liga1Fixture.findMany({
      where: {
        tournamentId: tournament.id,
        OR: [
          // Need HT: fetch window reached, no HT score yet
          { htFetchAt: { lte: now }, htHome: null },
          // Need FT: fetch window reached, no FT score yet (HT already present or also needed)
          { ftFetchAt: { lte: now }, ftHome: null },
        ],
        status: { not: "FINISHED" },
      },
    });

    if (pending.length === 0) continue;

    const toFetch = pending.map((f) => ({
      matchId: f.internalMatchId,
      matchday: f.matchday,
      homeTeamName: f.homeTeamName,
      awayTeamName: f.awayTeamName,
      utcDate: f.utcDate.toISOString(),
      needHt: now >= f.htFetchAt && f.htHome == null,
      needFt: now >= f.ftFetchAt && f.ftHome == null,
    }));

    let results;
    try {
      results = await fetchLiga1ResultsViaGemini(toFetch, parsed.season);
    } catch (e) {
      console.error(`Liga1 cron: Gemini fetch failed for tournament ${tournament.id}`, e);
      continue;
    }

    const resultMap = new Map(results.map((r) => [r.matchId, r]));

    for (const fixture of pending) {
      const result = resultMap.get(fixture.internalMatchId);
      if (!result) continue;

      const patch: Record<string, unknown> = {
        geminiConfident: result.confident,
      };

      if (!result.confident) {
        // Mark as PENDING so cron retries
        patch.status = "PENDING";
      } else {
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
      }

      await prisma.liga1Fixture.update({
        where: { id: fixture.id },
        data: patch,
      });

      totalUpdated++;
    }

    revalidatePath(`/party/${tournament.id}`);
  }

  return NextResponse.json({ ok: true, processed: tournaments.length, updated: totalUpdated });
}
