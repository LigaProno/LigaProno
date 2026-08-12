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

/**
 * Digest D−1 + reminder D−2/D−1 + clasamente etapă — țintă 09:00 Europe/Bucharest.
 * Cron-ul e programat la 06:00 și 07:00 UTC ca să lovească 09:00 atât iarna (EET)
 * cât și vara (EEST). Dedupe pe EmailDispatchLog previne dublurile.
 */
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

  // Secvențial: SMTP Gmail + claim-uri clare în loguri (fără curse între job-uri).
  const digest = await sendDailyDigests();
  const reminder = await sendPredictionReminders();
  const stageRank = await sendStageRankingEmails();

  return NextResponse.json({ ok: true, digest, reminder, stageRank });
}
