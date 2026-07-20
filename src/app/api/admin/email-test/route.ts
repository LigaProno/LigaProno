import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { emailConfigStatus } from "@/lib/email/mailer";
import { sendTestEmails } from "@/lib/email/send-jobs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_TEST_TO = "rizon.teodor@gmail.com";

/**
 * POST /api/admin/email-test
 * Body opțional: { "to": "..." }
 * Trimite sample-urile reminder / digest / ranking (doar admini).
 */
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = emailConfigStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        error: "Email not configured",
        hint: "Set GMAIL_USER and GMAIL_APP_PASSWORD in .env",
        status,
      },
      { status: 503 },
    );
  }

  let to = DEFAULT_TEST_TO;
  try {
    const body = (await req.json()) as { to?: string };
    if (typeof body?.to === "string" && body.to.includes("@")) {
      to = body.to.trim();
    }
  } catch {
    // body gol — folosim default
  }

  const results = await sendTestEmails(to);
  return NextResponse.json({ ok: true, to, status, results });
}

export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    status: emailConfigStatus(),
    defaultTo: DEFAULT_TEST_TO,
  });
}
