import { NextRequest, NextResponse } from "next/server";
import { sendPredictionReminders } from "@/lib/email/send-jobs";
import { isBucharestHour } from "@/lib/email/time";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Reminder predicții — țintă 12:00 Europe/Bucharest. */
export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isBucharestHour(12)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not 12:00 Europe/Bucharest",
    });
  }

  const result = await sendPredictionReminders();
  return NextResponse.json({ ok: true, ...result });
}
