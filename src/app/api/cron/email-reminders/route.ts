import { NextRequest, NextResponse } from "next/server";
import { sendPredictionReminders } from "@/lib/email/send-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Reminder D−1 (meciuri mâine) — trigger manual / legacy.
 * În producție rulează din `/api/cron/email-digest` la 09:00 București.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendPredictionReminders();
  return NextResponse.json({ ok: true, ...result });
}
