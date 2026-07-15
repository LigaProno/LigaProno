import type { NextThreeMatchPreds } from "@/components/party/next-three-predictions-panel";
import {
  COMPETITION_PICKER_OPTIONS,
  parseStoredCompetition,
} from "@/lib/competition";
import { loadCompetitionOddsSnapshot } from "@/lib/competition-odds";
import {
  filterUsableMatchOdds,
  payloadToOddsMaps,
  type BettingOddsPayload,
  type TournamentOddsMaps,
} from "@/lib/betting-odds";
import {
  fetchCompetitionMatches,
  venueLabel,
  type FootballDataMatch,
} from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import {
  fixtureTlaPair,
  filterMatchesForTournament,
  getMatchPredDisplay,
  hasAnyMatchPrediction,
  lastFinishedAndNextThree,
  matchResultHtFt,
  type MatchPredDisplay,
} from "@/lib/wc-pred-display";
import {
  computeUserWcTotals,
  type MatchPredictionInput,
} from "@/lib/wc-scoring";

export type GlobalLeaderboardLastMatch = {
  matchId: number;
  fixture: string;
  pred: MatchPredDisplay;
  actualHt: string | null;
  actualFt: string | null;
};

export type GlobalLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  bestTournamentId: string;
  bestTournamentName: string;
  bestTournamentCompetition: string;
  fg: number;
  pg: number;
  sc: number;
  correctScoreCount: number;
  total: number;
  lastMatch: GlobalLeaderboardLastMatch | null;
};

export type GlobalLeaderboardNextThreeBlock = {
  competition: string;
  competitionLabel: string;
  matches: NextThreeMatchPreds[];
};

export type GlobalLeaderboardResult = {
  rows: GlobalLeaderboardRow[];
  nextThreeByCompetition: GlobalLeaderboardNextThreeBlock[];
};

function displayName(first?: string | null, last?: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : "Membru";
}

function competitionDisplayLabel(competition: string): string {
  const opt = COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === competition);
  if (opt) return opt.label;
  const parsed = parseStoredCompetition(competition);
  return parsed ? `${parsed.code} ${parsed.season}` : competition;
}

type CompetitionScoringContext = {
  matches: FootballDataMatch[];
  oddsMaps: TournamentOddsMaps | undefined;
};

type TournamentMemberData = {
  predsByUser: Map<string, Map<number, MatchPredictionInput>>;
};

async function loadCompetitionOddsPayloadMap(
  competitions: string[],
): Promise<Map<string, BettingOddsPayload | null>> {
  const entries = await Promise.all(
    competitions.map(async (competition) => {
      const snapshot = await loadCompetitionOddsSnapshot(competition);
      return [competition, snapshot.payload] as const;
    }),
  );
  return new Map(entries);
}

async function loadCompetitionScoringContext(
  competition: string,
  oddsPayload: BettingOddsPayload | null,
): Promise<CompetitionScoringContext | null> {
  const parsed = parseStoredCompetition(competition);
  if (!parsed) return null;

  let matches: FootballDataMatch[] = [];
  try {
    matches = await fetchCompetitionMatches(parsed.code, parsed.season);
  } catch {
    // API indisponibil
  }

  const oddsMaps = payloadToOddsMaps(oddsPayload);
  return { matches, oddsMaps: oddsMaps ?? undefined };
}

async function loadTournamentMemberData(
  tournamentId: string,
): Promise<TournamentMemberData> {
  const wcMatchPreds = await prisma.wcMatchPrediction.findMany({ where: { tournamentId } });

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

  return { predsByUser };
}

function scoreUser(
  userId: string,
  tournamentId: string,
  tournamentName: string,
  competitionCtx: CompetitionScoringContext,
  memberData: TournamentMemberData,
  tournamentMatchdayFields: { startMatchday: number | null; endMatchday: number | null },
): Pick<
  GlobalLeaderboardRow,
  | "bestTournamentId"
  | "bestTournamentName"
  | "fg"
  | "pg"
  | "sc"
  | "correctScoreCount"
  | "total"
> {
  const totals = computeUserWcTotals(
    memberData.predsByUser.get(userId) ?? new Map(),
    filterMatchesForTournament(competitionCtx.matches, tournamentMatchdayFields),
    competitionCtx.oddsMaps,
  );

  return {
    bestTournamentId: tournamentId,
    bestTournamentName: tournamentName,
    fg: totals.fullTimeGuessPoints,
    pg: totals.halfTimeGuessPoints,
    sc: totals.correctScorePoints,
    correctScoreCount: totals.correctScoreCount,
    total: totals.total,
  };
}

function buildLastMatch(
  userId: string,
  memberData: TournamentMemberData,
  competitionCtx: CompetitionScoringContext,
  tournamentMatchdayFields: { startMatchday: number | null; endMatchday: number | null },
): GlobalLeaderboardLastMatch | null {
  const tournamentMatches = filterMatchesForTournament(
    competitionCtx.matches,
    tournamentMatchdayFields,
  );
  const { lastFinished } = lastFinishedAndNextThree(tournamentMatches);
  if (!lastFinished) return null;
  const pmap = memberData.predsByUser.get(userId) ?? new Map();
  const lastScores = matchResultHtFt(lastFinished);
  return {
    matchId: lastFinished.id,
    fixture: fixtureTlaPair(lastFinished),
    pred: getMatchPredDisplay(pmap.get(lastFinished.id) ?? null),
    actualHt: lastScores?.ht ?? null,
    actualFt: lastScores?.ft ?? null,
  };
}

function buildNextThreeByCompetition(
  rows: GlobalLeaderboardRow[],
  competitionCtxByKey: Map<string, CompetitionScoringContext>,
  memberDataByTournament: Map<string, TournamentMemberData>,
  oddsByCompetition: Map<string, BettingOddsPayload | null>,
): GlobalLeaderboardNextThreeBlock[] {
  const blocks: GlobalLeaderboardNextThreeBlock[] = [];

  for (const [competition, ctx] of competitionCtxByKey) {
    const { nextThree } = lastFinishedAndNextThree(ctx.matches);
    if (nextThree.length === 0) continue;

    const relevantRows = rows.filter((row) => row.bestTournamentCompetition === competition);
    if (relevantRows.length === 0) continue;

    const usableOdds = filterUsableMatchOdds(oddsByCompetition.get(competition)?.matches ?? {});

    const matches: NextThreeMatchPreds[] = nextThree.map((nm) => {
      const row = usableOdds[String(nm.id)];
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
        rows: relevantRows
          .map((leaderRow) => ({
            userId: leaderRow.userId,
            displayName: leaderRow.displayName,
            pred: getMatchPredDisplay(
              memberDataByTournament
                .get(leaderRow.bestTournamentId)
                ?.predsByUser.get(leaderRow.userId)
                ?.get(nm.id) ?? null,
            ),
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName, "ro")),
      };
    });

    blocks.push({
      competition,
      competitionLabel: competitionDisplayLabel(competition),
      matches,
    });
  }

  return blocks;
}

export async function refreshAllScores(): Promise<{ updated: number; errors: number }> {
  const tournaments = await prisma.tournament.findMany({
    where: { competition: { not: null } },
    include: { members: true },
  });

  const competitions = [
    ...new Set(
      tournaments
        .map((t) => t.competition)
        .filter((c): c is string => typeof c === "string" && c.length > 0),
    ),
  ];
  const oddsByCompetition = await loadCompetitionOddsPayloadMap(competitions);

  const competitionCtxByKey = new Map<string, CompetitionScoringContext>();
  for (const competition of competitions) {
    try {
      const ctx = await loadCompetitionScoringContext(
        competition,
        oddsByCompetition.get(competition) ?? null,
      );
      if (ctx) competitionCtxByKey.set(competition, ctx);
    } catch {
      // skip on hard failure
    }
  }

  let updated = 0;
  let errors = 0;

  for (const tournament of tournaments) {
    if (!tournament.competition) continue;

    const competitionCtx = competitionCtxByKey.get(tournament.competition);
    if (!competitionCtx) { errors++; continue; }

    let memberData: TournamentMemberData;
    try {
      memberData = await loadTournamentMemberData(tournament.id);
    } catch {
      errors++;
      continue;
    }

    await Promise.all(
      tournament.members.map(async (member) => {
        const score = scoreUser(
          member.userId,
          tournament.id,
          tournament.name,
          competitionCtx,
          memberData,
          tournament,
        );
        await prisma.tournamentMember.update({
          where: { id: member.id },
          data: {
            cachedFg: score.fg,
            cachedPg: score.pg,
            cachedSc: score.sc,
            cachedTotal: score.total,
            scoreUpdatedAt: new Date(),
          },
        });
        updated++;
      }),
    );
  }

  return { updated, errors };
}

export async function loadGlobalMemberPredictions(memberUserId: string): Promise<{
  tournamentId: string;
  tournamentName: string;
  memberDisplayName: string;
  rows: { match: FootballDataMatch; pred: MatchPredictionInput }[];
  loadError: string | null;
} | null> {
  const tournaments = await prisma.tournament.findMany({
    where: {
      competition: { not: null },
      members: { some: { userId: memberUserId } },
    },
    include: {
      members: {
        where: { userId: memberUserId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (tournaments.length === 0) return null;

  const competitions = [
    ...new Set(
      tournaments
        .map((t) => t.competition)
        .filter((c): c is string => typeof c === "string" && c.length > 0),
    ),
  ];
  const oddsByCompetition = await loadCompetitionOddsPayloadMap(competitions);

  const competitionCtxByKey = new Map<string, CompetitionScoringContext>();
  await Promise.all(
    competitions.map(async (competition) => {
      const ctx = await loadCompetitionScoringContext(
        competition,
        oddsByCompetition.get(competition) ?? null,
      );
      if (ctx) competitionCtxByKey.set(competition, ctx);
    }),
  );

  let best: {
    tournamentId: string;
    tournamentName: string;
    memberDisplayName: string;
    competition: string;
    total: number;
    memberData: TournamentMemberData;
    competitionCtx: CompetitionScoringContext;
    tournamentMatchdayFields: { startMatchday: number | null; endMatchday: number | null };
  } | null = null;

  for (const tournament of tournaments) {
    if (!tournament.competition) continue;
    const member = tournament.members[0];
    if (!member) continue;

    const competitionCtx = competitionCtxByKey.get(tournament.competition);
    if (!competitionCtx) continue;

    const memberData = await loadTournamentMemberData(tournament.id);
    const score = scoreUser(
      member.userId,
      tournament.id,
      tournament.name,
      competitionCtx,
      memberData,
      tournament,
    );

    if (!best || score.total > best.total) {
      best = {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        memberDisplayName: displayName(member.user.firstName, member.user.lastName),
        competition: tournament.competition,
        total: score.total,
        memberData,
        competitionCtx,
        tournamentMatchdayFields: tournament,
      };
    }
  }

  if (!best) return null;

  let matches = best.competitionCtx.matches;
  let loadError: string | null = null;

  try {
    const parsed = parseStoredCompetition(best.competition);
    if (parsed) {
      const fetched = await fetchCompetitionMatches(parsed.code, parsed.season);
      const { loadMatchesWithCompetitionVenues } = await import(
        "@/lib/competition-match-venues"
      );
      matches = await loadMatchesWithCompetitionVenues(best.competition, fetched);
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load matches.";
  }

  matches = filterMatchesForTournament(matches, best.tournamentMatchdayFields);

  const pmap = best.memberData.predsByUser.get(memberUserId) ?? new Map();

  const rows = [...(matches.length > 0 ? matches : best.competitionCtx.matches)]
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
    .filter((m) => hasAnyMatchPrediction(pmap.get(m.id)))
    .map((m) => ({
      match: m,
      pred: pmap.get(m.id)!,
    }));

  return {
    tournamentId: best.tournamentId,
    tournamentName: best.tournamentName,
    memberDisplayName: best.memberDisplayName,
    rows,
    loadError,
  };
}

export async function buildGlobalLeaderboard(): Promise<GlobalLeaderboardResult> {
  const tournaments = await prisma.tournament.findMany({
    where: { competition: { not: null } },
    include: {
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  const competitions = [
    ...new Set(
      tournaments
        .map((t) => t.competition)
        .filter((c): c is string => typeof c === "string" && c.length > 0),
    ),
  ];
  const oddsByCompetition = await loadCompetitionOddsPayloadMap(competitions);

  const competitionCtxByKey = new Map<string, CompetitionScoringContext>();
  await Promise.all(
    competitions.map(async (competition) => {
      const ctx = await loadCompetitionScoringContext(
        competition,
        oddsByCompetition.get(competition) ?? null,
      );
      if (ctx) competitionCtxByKey.set(competition, ctx);
    }),
  );

  const bestByUser = new Map<string, GlobalLeaderboardRow>();
  const memberDataByTournament = new Map<string, TournamentMemberData>();

  for (const tournament of tournaments) {
    if (!tournament.competition) continue;

    const competitionCtx = competitionCtxByKey.get(tournament.competition);
    if (!competitionCtx) continue;

    const memberData = await loadTournamentMemberData(tournament.id);
    memberDataByTournament.set(tournament.id, memberData);

    for (const member of tournament.members) {
      const score = scoreUser(
        member.userId,
        tournament.id,
        tournament.name,
        competitionCtx,
        memberData,
        tournament,
      );
      const lastMatch = buildLastMatch(member.userId, memberData, competitionCtx, tournament);
      const name = displayName(member.user.firstName, member.user.lastName);
      const candidate: GlobalLeaderboardRow = {
        rank: 0,
        userId: member.userId,
        displayName: name,
        bestTournamentCompetition: tournament.competition,
        lastMatch,
        ...score,
      };
      const existing = bestByUser.get(member.userId);
      if (!existing || candidate.total > existing.total) {
        bestByUser.set(member.userId, candidate);
      }
    }
  }

  const rows = [...bestByUser.values()];
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.displayName.localeCompare(b.displayName, "ro");
  });
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  return {
    rows,
    nextThreeByCompetition: buildNextThreeByCompetition(
      rows,
      competitionCtxByKey,
      memberDataByTournament,
      oddsByCompetition,
    ),
  };
}
