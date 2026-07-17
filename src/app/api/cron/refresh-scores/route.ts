import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshAllScores } from "@/lib/global-leaderboard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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

  const { updated, errors, badgesAwarded } = await refreshAllScores();
  revalidatePath("/turnee/clasament");
  if (badgesAwarded > 0) revalidatePath("/turnee");

  return NextResponse.json({ ok: true, updated, errors, badgesAwarded });
}
