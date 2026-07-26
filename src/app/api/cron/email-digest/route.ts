import { NextRequest, NextResponse } from "next/server";
import {
  sendDailyDigests,
  sendPredictionReminders,
  sendStageRankingEmails,
} from "@/lib/email/send-jobs";
import { isBucharestHour } from "@/lib/email/time";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Digest D−1 + reminder (meciuri mâine) + clasamente etapă — țintă 09:00 Europe/Bucharest. */
export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBucharestHour(9)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not 09:00 Europe/Bucharest",
    });
  }

  const [digest, reminder, stageRank] = await Promise.all([
    sendDailyDigests(),
    sendPredictionReminders(),
    sendStageRankingEmails(),
  ]);

  return NextResponse.json({ ok: true, digest, reminder, stageRank });
}
