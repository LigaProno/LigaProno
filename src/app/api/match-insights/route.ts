import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { parseStoredCompetition } from "@/lib/competition";
import { loadMatchInsights } from "@/lib/match-insights-fetch";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const matchId = Number(sp.get("matchId"));
  const homeId = Number(sp.get("homeId"));
  const awayId = Number(sp.get("awayId"));
  const competition = sp.get("competition");

  if (!Number.isFinite(matchId) || !Number.isFinite(homeId) || !Number.isFinite(awayId)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const parsed = parseStoredCompetition(competition);

  try {
    const data = await loadMatchInsights({
      matchId,
      homeId,
      awayId,
      competitionCode: parsed?.code ?? null,
      competitionSeason: parsed?.season ?? null,
    });
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load match insights";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
