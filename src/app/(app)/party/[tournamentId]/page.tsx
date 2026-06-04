import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PartyWcDashboard, {
  type LeaderboardRow,
} from "@/components/party/party-wc-dashboard";
import {
  collectTeamsFromMatches,
  createEmptyWcGroupStandings,
  fetchCompetitionMatches,
  fetchPartyStandings,
  getFootballDataCompetitionPickerOptions,
  type FootballDataMatch,
  type GroupStanding,
} from "@/lib/football-data";
import {
  isWorldCup2026Storage,
  parseStoredCompetition,
  type FootballDataCompetitionPickerOption,
} from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { formatMatchKickoff } from "@/lib/match-datetime";
import {
  championLabelFromTeams,
  fixtureTlaPair,
  formatPredShort,
  lastFinishedAndNextThree,
  matchResultHtFt,
} from "@/lib/wc-pred-display";
import type { NextThreeMatchPreds } from "@/components/party/next-three-predictions-panel";
import {
  parseBettingOddsPayload,
  payloadToOddsMaps,
} from "@/lib/betting-odds";
import { isCompetitionUnderway } from "@/lib/prediction-window";
import {
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
      bettingOdds: true,
    },
  });

  if (!tournament) notFound();

  const isMember = tournament.members.some((m) => m.userId === user.id);
  if (!isMember) redirect("/party");

  const isCreator = tournament.creatorId === user.id;

  const parsedCompetition = parseStoredCompetition(tournament.competition);

  let matches: FootballDataMatch[] = [];
  let loadError: string | null = null;

  if (parsedCompetition) {
    try {
      matches = await fetchCompetitionMatches(
        parsedCompetition.code,
        parsedCompetition.season,
      );
    } catch (e) {
      loadError =
        e instanceof Error ? e.message : "Could not load matches.";
    }
  }

  let standings: GroupStanding[] = [];
  if (parsedCompetition && !loadError) {
    try {
      standings = await fetchPartyStandings(
        parsedCompetition.code,
        parsedCompetition.season,
        matches,
      );
    } catch {
      standings =
        isWorldCup2026Storage(tournament.competition) ?
          createEmptyWcGroupStandings()
        : [];
    }
  }

  const allTeams =
    parsedCompetition && matches.length > 0 ?
      collectTeamsFromMatches(matches)
    : [];

  let competitionPickerOptions: FootballDataCompetitionPickerOption[] = [];
  try {
    competitionPickerOptions =
      await getFootballDataCompetitionPickerOptions();
  } catch {
    competitionPickerOptions = [];
  }

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

  const { lastFinished, nextThree } = lastFinishedAndNextThree(matches);

  const nextThreeMemberPreds: NextThreeMatchPreds[] = nextThree.map((nm) => ({
    matchId: nm.id,
    fixture: fixtureTlaPair(nm),
    kickoff: formatMatchKickoff(nm.utcDate),
    rows: tournament.members
      .map((m) => ({
        userId: m.userId,
        displayName: displayName(m.user.firstName, m.user.lastName),
        pred: formatPredShort(predsByUser.get(m.userId)?.get(nm.id) ?? null),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "ro")),
  }));

  const oddsPayload =
    tournament.bettingOdds?.payload != null ?
      parseBettingOddsPayload(tournament.bettingOdds.payload)
    : null;
  const oddsMaps = payloadToOddsMaps(oddsPayload);

  const competitionUnderway =
    parsedCompetition && !loadError && matches.length > 0 ?
      isCompetitionUnderway(matches)
    : false;

  const leaderboardRows: LeaderboardRow[] = tournament.members.map((m) => {
    const totals = computeUserWcTotals(
      predsByUser.get(m.userId) ?? new Map(),
      extraByUser.get(m.userId) ?? null,
      matches,
      standings,
      oddsMaps ?? undefined,
      m.midCompetitionPredictionChangeCount ?? 0,
    );
    const pmap = predsByUser.get(m.userId) ?? new Map();
    const extra = extraByUser.get(m.userId) ?? null;

    const lastScores = lastFinished ? matchResultHtFt(lastFinished) : null;
    const lastMatch =
      lastFinished ?
        {
          matchId: lastFinished.id,
          fixture: fixtureTlaPair(lastFinished),
          pred: formatPredShort(pmap.get(lastFinished.id) ?? null),
          actualHt: lastScores?.ht ?? null,
          actualFt: lastScores?.ft ?? null,
        }
      : null;

    const nextMatches = [0, 1, 2].map((i) => {
      const nm = nextThree[i];
      if (!nm) return null;
      return {
        matchId: nm.id,
        fixture: fixtureTlaPair(nm),
        pred: formatPredShort(pmap.get(nm.id) ?? null),
      };
    });

    return {
      rank: 0,
      userId: m.userId,
      displayName: displayName(m.user.firstName, m.user.lastName),
      fg: totals.fullTimeGuessPoints,
      pg: totals.halfTimeGuessPoints,
      sc: totals.correctScorePoints,
      cg: totals.qualifierPoints,
      championPoints: totals.championPoints,
      changePenalty: totals.predictionChangePenalty,
      total: totals.total,
      championPick: championLabelFromTeams(extra?.championTeamId ?? null, allTeams),
      lastMatch,
      nextMatches,
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

  const myMembership = tournament.members.find((mem) => mem.userId === user.id);
  const myMidCompetitionChangeCount =
    myMembership?.midCompetitionPredictionChangeCount ?? 0;

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

      {loadError && parsedCompetition && (
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
        allowPredictionChangesDuringCompetition={
          tournament.allowPredictionChangesDuringCompetition ?? false
        }
        competitionUnderway={competitionUnderway}
        myMidCompetitionChangeCount={myMidCompetitionChangeCount}
        competitionPickerOptions={competitionPickerOptions}
        showDevClSimulator={process.env.NODE_ENV === "development"}
        isCreator={isCreator}
        currentUserId={user.id}
        matches={matches}
        standings={standings}
        leaderboard={leaderboardRows}
        myPreds={myPredsRecord}
        myExtra={myExtra}
        allTeams={allTeams}
        bettingOddsByMatchId={oddsPayload?.matches ?? {}}
        bettingOddsFetchedAt={tournament.bettingOdds?.fetchedAt?.toISOString() ?? null}
        nextThreeMemberPreds={nextThreeMemberPreds}
      />
    </div>
  );
}
