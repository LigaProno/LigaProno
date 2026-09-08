import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshStaleScoresFromOddsPortal } from "@/lib/competition-match-scores";
import { sendFinalRankingEmails } from "@/lib/email/send-jobs";
import { refreshAllScores } from "@/lib/global-leaderboard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Fallback scoruri OddsPortal pentru meciuri stale pe Football-Data,
 * apoi recalcul clasamente dacă s-a scrapeat ceva.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fallback = await refreshStaleScoresFromOddsPortal();

  let scores = null;
  let finalRank = null;
  if (fallback.scraped > 0) {
    scores = await refreshAllScores();
    revalidatePath("/turnee");
    revalidatePath("/turnee/clasament");
    revalidatePath("/matches");
    // Un turneu raportează `justClosed` o singură dată, deci orice rută care
    // închide trebuie să trimită și clasamentul final — altfel se pierde definitiv.
    if (scores.newlyClosedTournamentIds.length > 0) {
      finalRank = await sendFinalRankingEmails(scores.newlyClosedTournamentIds);
    }
  }

  return NextResponse.json({
    ok: true,
    fallback,
    scores,
    finalRank,
  });
}
