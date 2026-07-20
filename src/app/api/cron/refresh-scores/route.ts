import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { updated, errors, badgesAwarded, newlyClosedTournamentIds } =
    await refreshAllScores();
  revalidatePath("/turnee/clasament");
  if (badgesAwarded > 0 || newlyClosedTournamentIds.length > 0) {
    revalidatePath("/turnee");
  }

  let finalRank = null;
  if (newlyClosedTournamentIds.length > 0) {
    finalRank = await sendFinalRankingEmails(newlyClosedTournamentIds);
  }

  return NextResponse.json({
    ok: true,
    updated,
    errors,
    badgesAwarded,
    newlyClosedTournamentIds,
    finalRank,
  });
}
