import { NextRequest, NextResponse } from "next/server";
import { runScheduledEmailJobs } from "@/lib/email/send-jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isCronAuthorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/**
 * Digest D−1 (retry D−2) + reminder azi/D−1/D−2 + clasamente etapă + retry turnee noi.
 * Cron zilnic Hobby (06:00 UTC), în locul fostului wc-news.
 */
export async function GET(req: NextRequest) {
  if (!isCronAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await runScheduledEmailJobs();
  return NextResponse.json({ ok: true, ...jobs });
}
