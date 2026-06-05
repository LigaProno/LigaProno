import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import GlobalLeaderboardTable from "@/components/turnee/global-leaderboard-table";
import { buildGlobalLeaderboard, type GlobalLeaderboardRow } from "@/lib/global-leaderboard";
import { prisma } from "@/lib/prisma";

export default async function GlobalLeaderboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });

  let rows: GlobalLeaderboardRow[] = [];
  let loadError: string | null = null;

  try {
    rows = await buildGlobalLeaderboard();
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Nu s-a putut încărca clasamentul.";
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <Link
        href="/turnee"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Înapoi la Turnee
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Clasament global</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Toți utilizatorii înscriși — se afișează cel mai bun scor al fiecăruia, indiferent câte turnee a
          creat sau a joinat.
        </p>
      </div>

      {loadError && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm text-red-300"
          style={{
            borderColor: "rgba(248,113,113,0.35)",
            backgroundColor: "rgba(127,29,29,0.25)",
          }}
        >
          {loadError}
        </div>
      )}

      <GlobalLeaderboardTable rows={rows} currentUserId={user?.id} />
    </div>
  );
}
