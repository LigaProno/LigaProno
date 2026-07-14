import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { refreshAllDashboardNews } from "@/lib/wc-dashboard-news";

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

  try {
    const results = await refreshAllDashboardNews();
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("wc-news cron:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
