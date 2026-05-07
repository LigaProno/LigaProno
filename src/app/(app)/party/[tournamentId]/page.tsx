import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PartyWcDashboard, {
  type LeaderboardRow,
} from "@/components/party/party-wc-dashboard";
import {
  collectTeamsFromMatches,
  createEmptyWcGroupStandings,
  fetchWorldCupGroupStandings,
  fetchWorldCupMatchesFootballData,
  type FootballDataMatch,
} from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import {
  COMPETITION_WC_2026,
  computeUserWcTotals,
  type MatchPredictionInput,
} from "@/lib/wc-scoring";

function displayName(first?: string | null, last?: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : "Member";
}

export default async function PartyTournamentPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!tournament) notFound();

  const isMember = tournament.members.some((m) => m.userId === user.id);
  if (!isMember) redirect("/party");

  const isCreator = tournament.creatorId === user.id;

  let matches: FootballDataMatch[] = [];
  let loadError: string | null = null;

  if (tournament.competition === COMPETITION_WC_2026) {
    try {
      matches = await fetchWorldCupMatchesFootballData();
    } catch (e) {
      loadError =
        e instanceof Error ? e.message : "Could not load matches.";
    }
  }

  let standings = createEmptyWcGroupStandings();
  if (tournament.competition === COMPETITION_WC_2026 && !loadError) {
    try {
      standings = await fetchWorldCupGroupStandings(matches);
    } catch {
      standings = createEmptyWcGroupStandings();
    }
  }

  const allTeams =
    tournament.competition === COMPETITION_WC_2026 && matches.length > 0 ?
      collectTeamsFromMatches(matches)
    : [];

  const wcMatchPreds = await prisma.wcMatchPrediction.findMany({
    where: { tournamentId },
  });

  const wcExtras = await prisma.wcExtraPrediction.findMany({
    where: { tournamentId },
  });

  const predsByUser = new Map<string, Map<number, MatchPredictionInput>>();
  for (const p of wcMatchPreds) {
    if (!predsByUser.has(p.userId)) predsByUser.set(p.userId, new Map());
    predsByUser.get(p.userId)!.set(p.matchId, {
      htOutcome: p.htOutcome,
      ftOutcome: p.ftOutcome,
      predHomeGoals: p.predHomeGoals,
      predAwayGoals: p.predAwayGoals,
    });
  }

  const extraByUser = new Map(
    wcExtras.map((e) => [
      e.userId,
      {
        advancingTeamIds: e.advancingTeamIds,
        championTeamId: e.championTeamId,
      },
    ]),
  );

  const leaderboardRows: LeaderboardRow[] = tournament.members.map((m) => {
    const totals = computeUserWcTotals(
      predsByUser.get(m.userId) ?? new Map(),
      extraByUser.get(m.userId) ?? null,
      matches,
      standings,
    );
    return {
      rank: 0,
      userId: m.userId,
      displayName: displayName(m.user.firstName, m.user.lastName),
      fg: totals.fullTimeGuessPoints,
      pg: totals.halfTimeGuessPoints,
      sc: totals.correctScorePoints,
      cg: totals.qualifierPoints,
      championPoints: totals.championPoints,
      total: totals.total,
    };
  });

  leaderboardRows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.displayName.localeCompare(b.displayName, "en");
  });
  leaderboardRows.forEach((r, i) => {
    r.rank = i + 1;
  });

  const myPredsRecord: Record<
    number,
    {
      htOutcome: string | null;
      ftOutcome: string | null;
      predHomeGoals: number | null;
      predAwayGoals: number | null;
    }
  > = {};

  const minePredMap = predsByUser.get(user.id);
  if (minePredMap) {
    for (const [mid, pred] of minePredMap) {
      myPredsRecord[mid] = {
        htOutcome: pred.htOutcome ?? null,
        ftOutcome: pred.ftOutcome ?? null,
        predHomeGoals: pred.predHomeGoals ?? null,
        predAwayGoals: pred.predAwayGoals ?? null,
      };
    }
  }

  const myExtra = extraByUser.get(user.id) ?? null;

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
      <Link
        href="/party"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Party
      </Link>

      {loadError && tournament.competition === COMPETITION_WC_2026 && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm text-red-300"
          style={{
            borderColor: "rgba(248,113,113,0.35)",
            backgroundColor: "rgba(127,29,29,0.25)",
          }}
        >
          {loadError} Check FOOTBALL_DATA_TOKEN in `.env`.
        </div>
      )}

      <PartyWcDashboard
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        inviteCode={tournament.inviteCode}
        competition={tournament.competition}
        isCreator={isCreator}
        currentUserId={user.id}
        matches={matches}
        standings={standings}
        leaderboard={leaderboardRows}
        myPreds={myPredsRecord}
        myExtra={myExtra}
        allTeams={allTeams}
      />
    </div>
  );
}
