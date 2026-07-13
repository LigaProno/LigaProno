import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PartyWcDashboard, {
  type LeaderboardRow,
} from "@/components/party/party-wc-dashboard";
import {
  fetchCompetitionMatches,
  venueLabel,
  type FootballDataMatch,
} from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import { loadCompetitionOddsSnapshot } from "@/lib/competition-odds";
import { loadMatchesWithCompetitionVenues } from "@/lib/competition-match-venues";
import { canManualRefreshOddsToday } from "@/lib/odds-refresh-limit";
import { prisma } from "@/lib/prisma";
import {
  fixtureTlaPair,
  getMatchPredDisplay,
  lastFinishedAndNextThree,
  matchResultHtFt,
} from "@/lib/wc-pred-display";
import type { NextThreeMatchPreds } from "@/components/party/next-three-predictions-panel";
import { filterUsableMatchOdds, payloadToOddsMaps } from "@/lib/betting-odds";
import {
  computeUserWcTotals,
  type MatchPredictionInput,
} from "@/lib/wc-scoring";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";

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
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const [user, tournament, wcMatchPreds] =
    await Promise.all([
      prisma.user.findUnique({ where: { clerkId } }),
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.wcMatchPrediction.findMany({ where: { tournamentId } }),
    ]);

  if (!user) redirect("/sign-in");
  if (!tournament) notFound();

  const isMember = tournament.members.some((m) => m.userId === user.id);
  if (!isMember) redirect("/turnee");

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
      loadError = e instanceof Error ? e.message : "Could not load matches.";
    }
  }

  if (parsedCompetition && !loadError && matches.length > 0) {
    matches = await loadMatchesWithCompetitionVenues(
      tournament.competition!,
      matches,
    );
  }


  const competitionOddsSnapshot =
    tournament.competition ?
      await loadCompetitionOddsSnapshot(tournament.competition)
    : null;

  const canManualRefreshOddsTodayFlag = canManualRefreshOddsToday(
    competitionOddsSnapshot?.lastManualRefreshAt,
  );

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


  const oddsPayload = competitionOddsSnapshot?.payload ?? null;
  const oddsMaps = payloadToOddsMaps(oddsPayload);
  const usableMatchOddsById = filterUsableMatchOdds(oddsPayload?.matches ?? {});

  const { lastFinished, nextThree } = lastFinishedAndNextThree(matches);

  const nextThreeMemberPreds: NextThreeMatchPreds[] = nextThree.map((nm) => {
    const row = usableMatchOddsById[String(nm.id)];
    return {
      matchId: nm.id,
      utcDate: nm.utcDate,
      homeTeam: {
        name: nm.homeTeam.name ?? nm.homeTeam.shortName ?? "—",
        shortName: nm.homeTeam.tla ?? nm.homeTeam.shortName ?? undefined,
        crest: nm.homeTeam.crest,
      },
      awayTeam: {
        name: nm.awayTeam.name ?? nm.awayTeam.shortName ?? "—",
        shortName: nm.awayTeam.tla ?? nm.awayTeam.shortName ?? undefined,
        crest: nm.awayTeam.crest,
      },
      venue: venueLabel(nm),
      ftOdds: row ?
        {
          home: row.ft1x2.HOME,
          draw: row.ft1x2.DRAW,
          away: row.ft1x2.AWAY,
        }
      : null,
      rows: tournament.members
        .map((m) => ({
          userId: m.userId,
          displayName: displayName(m.user.firstName, m.user.lastName),
          pred: getMatchPredDisplay(predsByUser.get(m.userId)?.get(nm.id) ?? null),
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "ro")),
    };
  });

  const leaderboardRows: LeaderboardRow[] = tournament.members.map((m) => {
    const totals = computeUserWcTotals(
      predsByUser.get(m.userId) ?? new Map(),
      matches,
      oddsMaps ?? undefined,
    );
    const pmap = predsByUser.get(m.userId) ?? new Map();

    const lastScores = lastFinished ? matchResultHtFt(lastFinished) : null;
    const lastMatch =
      lastFinished ?
        {
          matchId: lastFinished.id,
          fixture: fixtureTlaPair(lastFinished),
          pred: getMatchPredDisplay(pmap.get(lastFinished.id) ?? null),
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
        pred: getMatchPredDisplay(pmap.get(nm.id) ?? null),
      };
    });

    return {
      rank: 0,
      userId: m.userId,
      displayName: displayName(m.user.firstName, m.user.lastName),
      fg: totals.fullTimeGuessPoints,
      pg: totals.halfTimeGuessPoints,
      sc: totals.correctScorePoints,
      correctScoreCount: totals.correctScoreCount,
      total: totals.total,
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

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
      <Link
        href="/turnee"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t("party.backToTournaments")}
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
        isCreator={isCreator}
        currentUserId={user.id}
        matches={matches}
        leaderboard={leaderboardRows}
        myPreds={myPredsRecord}
        bettingOddsByMatchId={usableMatchOddsById}
        bettingOddsFetchedAt={competitionOddsSnapshot?.fetchedAt?.toISOString() ?? null}
        lastManualOddsRefreshAt={
          competitionOddsSnapshot?.lastManualRefreshAt?.toISOString() ?? null
        }
        canManualRefreshOddsToday={canManualRefreshOddsTodayFlag}
        nextThreeMemberPreds={nextThreeMemberPreds}
      />
    </div>
  );
}
