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
  filterMatchesForTournament,
  getMatchPredDisplay,
  lastFinishedAndNextThree,
  matchResultHtFt,
  matchesForMatchday,
  recentAndUpcomingMatches,
} from "@/lib/wc-pred-display";
import type { NextThreeMatchPreds } from "@/components/party/next-three-predictions-panel";
import { filterUsableMatchOdds, payloadToOddsMaps } from "@/lib/betting-odds";
import {
  computeUserWcTotals,
  type MatchPredictionInput,
} from "@/lib/wc-scoring";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { loadWinBadgesByUser } from "@/lib/tournament-wins";
import { isAdminEmail } from "@/lib/admin";
import { loadTournamentLiveFixtures } from "@/lib/live-fixtures";
import { PrizePreferencePanel } from "@/components/turnee/prize-preference-panel";
import { PrizeAllocationView } from "@/components/turnee/prize-allocation-view";

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

  const [user, tournament, wcMatchPreds] = await Promise.all([
      prisma.user.findUnique({ where: { clerkId } }),
      prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, cachedBestStreak: true } },
            },
          },
        },
      }),
      prisma.wcMatchPrediction.findMany({ where: { tournamentId } }),
    ]);

  if (!user) redirect("/sign-in");
  if (!tournament) notFound();

  const isAdmin = isAdminEmail(user.email);
  const isMember = tournament.members.some((m) => m.userId === user.id);
  // Adminii pot inspecta orice turneu fără să fie membri.
  if (!isMember && !isAdmin) redirect("/turnee");

  const isCreator = tournament.creatorId === user.id;
  const tournamentMembers = tournament.members;

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

  matches = filterMatchesForTournament(matches, tournament);


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
  // Panoul „pronosticuri grupă": fereastră glisantă — ultimele 2 meciuri
  // terminate + următoarele 3, nu toată etapa deodată.
  const memberPredsWindow = recentAndUpcomingMatches(matches, 2, 3);

  function buildMemberPredsBlock(nm: FootballDataMatch): NextThreeMatchPreds {
    const row = usableMatchOddsById[String(nm.id)];
    const isDone = nm.status === "FINISHED" || nm.status === "AWARDED";
    return {
      matchId: nm.id,
      utcDate: nm.utcDate,
      result: isDone ? matchResultHtFt(nm) : null,
      // Trimitem câmpurile ca în API (inclusiv tla), altfel override-urile de nume nu se aplică.
      homeTeam: {
        name: nm.homeTeam.name ?? nm.homeTeam.shortName ?? "—",
        shortName: nm.homeTeam.shortName ?? undefined,
        tla: nm.homeTeam.tla ?? undefined,
        crest: nm.homeTeam.crest,
      },
      awayTeam: {
        name: nm.awayTeam.name ?? nm.awayTeam.shortName ?? "—",
        shortName: nm.awayTeam.shortName ?? undefined,
        tla: nm.awayTeam.tla ?? undefined,
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
      rows: tournamentMembers
        .map((m) => ({
          userId: m.userId,
          displayName: m.displayName ?? displayName(m.user.firstName, m.user.lastName),
          pred: getMatchPredDisplay(predsByUser.get(m.userId)?.get(nm.id) ?? null),
        }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "ro")),
    };
  }

  // În turneele publice nu expunem pronosticurile celorlalți — nici măcar în payload-ul paginii.
  const matchdayMemberPreds: NextThreeMatchPreds[] =
    tournament.isPublic ? [] : memberPredsWindow.map(buildMemberPredsBlock);

  // O singură interogare pentru badge-urile tuturor membrilor, nu una per rând.
  const memberIds = tournamentMembers.map((m) => m.userId);
  const winsByUser = await loadWinBadgesByUser(memberIds);

  // Meciurile live din fereastra turneului (cache 60s, partajat) pentru banner.
  const liveFixtures = await loadTournamentLiveFixtures(tournament);

  // Celelalte turnee ale userului — ținte pentru „copiază pronosticurile".
  // Turneele încheiate (closedAt setat) nu apar: nu mai poți schimba pronosticuri acolo.
  const otherMemberships = await prisma.tournamentMember.findMany({
    where: { userId: user.id, NOT: { tournamentId }, tournament: { closedAt: null } },
    select: { tournament: { select: { id: true, name: true, competition: true } } },
    orderBy: { joinedAt: "desc" },
  });
  const otherTournaments = otherMemberships.map((m) => ({
    id: m.tournament.id,
    name: m.tournament.name,
    competition: m.tournament.competition,
  }));

  const leaderboardRows: LeaderboardRow[] = tournamentMembers.map((m) => {
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
      displayName: m.displayName ?? displayName(m.user.firstName, m.user.lastName),
      wins: winsByUser.get(m.userId) ?? [],
      bestStreak: m.user.cachedBestStreak,
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

  // Repartizare premii (doar organizatorul o vede): draft în ordinea clasamentului.
  const isOrganizer = isCreator || isAdmin;
  let prizeAllocation:
    | {
        allocation: { rank: number; name: string; total: number; shirt: string; fromPref: boolean }[];
        allPrefs: { rank: number; name: string; preference: string[] }[];
        finished: boolean;
      }
    | null = null;
  if (tournament.prizePool.length > 0 && isOrganizer) {
    const prefByUser = new Map(tournamentMembers.map((m) => [m.userId, m.prizePreference]));
    const remaining = new Set(tournament.prizePool);
    const allocation: { rank: number; name: string; total: number; shirt: string; fromPref: boolean }[] = [];
    for (const r of leaderboardRows) {
      if (remaining.size === 0) break;
      const pref = prefByUser.get(r.userId) ?? [];
      const pick = pref.find((p) => remaining.has(p)) ?? [...remaining][0];
      remaining.delete(pick);
      allocation.push({ rank: r.rank, name: r.displayName, total: r.total, shirt: pick, fromPref: pref.includes(pick) });
    }
    const allPrefs = leaderboardRows.map((r) => ({
      rank: r.rank,
      name: r.displayName,
      preference: prefByUser.get(r.userId) ?? [],
    }));
    prizeAllocation = { allocation, allPrefs, finished: tournament.closedAt != null };
  }

  // Concurs separat pe o etapă (doar turneele cu prizeMatchday setat): clasament
  // calculat DOAR din meciurile acelei etape, deci toți pornesc de la 0.
  const prizeMatchday = tournament.prizeMatchday;
  let prizeLeaderboard: LeaderboardRow[] = [];
  if (prizeMatchday != null) {
    const prizeMatches = matchesForMatchday(matches, prizeMatchday);
    const prizeFinished = prizeMatches.filter(
      (m) => m.status === "FINISHED" || m.status === "AWARDED",
    );
    const prizeLast = prizeFinished.length ? prizeFinished[prizeFinished.length - 1] : null;
    const prizeLastScores = prizeLast ? matchResultHtFt(prizeLast) : null;

    prizeLeaderboard = tournamentMembers.map((m) => {
      const pmap = predsByUser.get(m.userId) ?? new Map();
      const totals = computeUserWcTotals(pmap, prizeMatches, oddsMaps ?? undefined);
      return {
        rank: 0,
        userId: m.userId,
        displayName: m.displayName ?? displayName(m.user.firstName, m.user.lastName),
        wins: winsByUser.get(m.userId) ?? [],
        bestStreak: m.user.cachedBestStreak,
        fg: totals.fullTimeGuessPoints,
        pg: totals.halfTimeGuessPoints,
        sc: totals.correctScorePoints,
        correctScoreCount: totals.correctScoreCount,
        total: totals.total,
        lastMatch:
          prizeLast ?
            {
              matchId: prizeLast.id,
              fixture: fixtureTlaPair(prizeLast),
              pred: getMatchPredDisplay(pmap.get(prizeLast.id) ?? null),
              actualHt: prizeLastScores?.ht ?? null,
              actualFt: prizeLastScores?.ft ?? null,
            }
          : null,
        nextMatches: [null, null, null],
      };
    });

    prizeLeaderboard.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.displayName.localeCompare(b.displayName, "en");
    });
    prizeLeaderboard.forEach((r, i) => {
      r.rank = i + 1;
    });
  }

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

      {prizeAllocation ? (
        <PrizeAllocationView
          allocation={prizeAllocation.allocation}
          allPrefs={prizeAllocation.allPrefs}
          finished={prizeAllocation.finished}
        />
      ) : null}

      {tournament.prizePool.length > 0 && isMember ? (
        <div
          className="mb-6 rounded-2xl border p-4 sm:p-5 flex flex-col gap-3"
          style={{ borderColor: "rgba(197,160,89,0.3)", backgroundColor: "rgba(197,160,89,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden>🎁</span>
            <h2 className="text-base font-bold text-white">{t("party.prizePref.title")}</h2>
          </div>
          <PrizePreferencePanel
            tournamentId={tournament.id}
            pool={tournament.prizePool}
            initial={tournamentMembers.find((m) => m.userId === user.id)?.prizePreference ?? []}
            editable={tournament.closedAt == null}
          />
        </div>
      ) : null}

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
        isPublic={tournament.isPublic}
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
        nextThreeMemberPreds={matchdayMemberPreds}
        liveFixtures={liveFixtures}
        otherTournaments={otherTournaments}
        prizeLeaderboard={prizeLeaderboard}
        prizeMatchday={prizeMatchday}
      />
    </div>
  );
}
