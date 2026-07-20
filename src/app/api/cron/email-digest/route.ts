import { NextRequest, NextResponse } from "next/server";
import {
  sendDailyDigests,
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

/** Rezumat D−1 + clasamente etapă — țintă 09:00 Europe/Bucharest. */
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

  const [digest, stageRank] = await Promise.all([
    sendDailyDigests(),
    sendStageRankingEmails(),
  ]);

  return NextResponse.json({ ok: true, digest, stageRank });
}
