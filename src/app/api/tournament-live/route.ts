import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { loadTournamentLiveFixtures } from "@/lib/live-fixtures";

export const dynamic = "force-dynamic";

/** Scoruri live pentru banner-ul din turneu; interogat periodic de client. */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tournamentId = req.nextUrl.searchParams.get("id");
  if (!tournamentId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { competition: true, startMatchday: true, endMatchday: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fixtures = await loadTournamentLiveFixtures(tournament);
  return NextResponse.json({ fixtures });
}
