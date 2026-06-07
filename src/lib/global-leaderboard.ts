import {
  isWorldCup2026Storage,
  parseStoredCompetition,
} from "@/lib/competition";
import {
  parseBettingOddsPayload,
  payloadToOddsMaps,
} from "@/lib/betting-odds";
import {
  createEmptyWcGroupStandings,
  fetchCompetitionMatches,
  fetchPartyStandings,
  type FootballDataMatch,
  type GroupStanding,
} from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import {
  computeUserWcTotals,
  type MatchPredictionInput,
} from "@/lib/wc-scoring";

export type GlobalLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  bestTournamentId: string;
  bestTournamentName: string;
  fg: number;
  pg: number;
  sc: number;
  cg: number;
  championPoints: number;
  changePenalty: number;
  total: number;
};

function displayName(first?: string | null, last?: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : "Membru";
}

type TournamentContext = {
  tournamentId: string;
  tournamentName: string;
  matches: FootballDataMatch[];
  standings: GroupStanding[];
  oddsMaps: ReturnType<typeof payloadToOddsMaps> | undefined;
  predsByUser: Map<string, Map<number, MatchPredictionInput>>;
  extraByUser: Map<
    string,
    { advancingTeamIds: number[]; championTeamId: number | null }
  >;
  changeCountByUser: Map<string, number>;
};

async function loadTournamentContext(
  tournamentId: string,
  tournamentName: string,
  competition: string,
  oddsPayload: unknown,
): Promise<TournamentContext | null> {
  const parsed = parseStoredCompetition(competition);
  if (!parsed) return null;

  let matches: FootballDataMatch[] = [];
  try {
    matches = await fetchCompetitionMatches(parsed.code, parsed.season);
  } catch {
    return null;
  }

  let standings: GroupStanding[] = [];
  try {
    standings = await fetchPartyStandings(parsed.code, parsed.season, matches);
  } catch {
    standings =
      isWorldCup2026Storage(competition) ? createEmptyWcGroupStandings() : [];
  }

  const wcMatchPreds = await prisma.wcMatchPrediction.findMany({
    where: { tournamentId },
  });
  const wcExtras = await prisma.wcExtraPrediction.findMany({
    where: { tournamentId },
  });
  const members = await prisma.tournamentMember.findMany({
    where: { tournamentId },
    select: { userId: true, midCompetitionPredictionChangeCount: true },
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

  const changeCountByUser = new Map(
    members.map((m) => [m.userId, m.midCompetitionPredictionChangeCount ?? 0]),
  );

  const oddsParsed =
    oddsPayload != null ? parseBettingOddsPayload(oddsPayload) : null;
  const oddsMaps = payloadToOddsMaps(oddsParsed);

  return {
    tournamentId,
    tournamentName,
    matches,
    standings,
    oddsMaps: oddsMaps ?? undefined,
    predsByUser,
    extraByUser,
    changeCountByUser,
  };
}

function scoreUserInContext(
  ctx: TournamentContext,
  userId: string,
): Omit<GlobalLeaderboardRow, "rank" | "displayName" | "userId"> {
  const totals = computeUserWcTotals(
    ctx.predsByUser.get(userId) ?? new Map(),
    ctx.extraByUser.get(userId) ?? null,
    ctx.matches,
    ctx.standings,
    ctx.oddsMaps,
    ctx.changeCountByUser.get(userId) ?? 0,
  );

  return {
    bestTournamentId: ctx.tournamentId,
    bestTournamentName: ctx.tournamentName,
    fg: totals.fullTimeGuessPoints,
    pg: totals.halfTimeGuessPoints,
    sc: totals.correctScorePoints,
    cg: totals.qualifierPoints,
    championPoints: totals.championPoints,
    changePenalty: totals.predictionChangePenalty,
    total: totals.total,
  };
}

// Recomputes scores for every member of every competition tournament and
// writes the results back to TournamentMember. Called by the cron job.
export async function refreshAllScores(): Promise<{ updated: number; errors: number }> {
  const tournaments = await prisma.tournament.findMany({
    where: { competition: { not: null } },
    include: {
      members: true,
      bettingOdds: true,
    },
  });

  let updated = 0;
  let errors = 0;

  for (const tournament of tournaments) {
    if (!tournament.competition) continue;

    let ctx: TournamentContext | null = null;
    try {
      ctx = await loadTournamentContext(
        tournament.id,
        tournament.name,
        tournament.competition,
        tournament.bettingOdds?.payload ?? null,
      );
    } catch {
      errors++;
      continue;
    }
    if (!ctx) continue;

    const now = new Date();
    await Promise.all(
      tournament.members.map(async (member) => {
        const score = scoreUserInContext(ctx!, member.userId);
        await prisma.tournamentMember.update({
          where: { id: member.id },
          data: {
            cachedFg: score.fg,
            cachedPg: score.pg,
            cachedSc: score.sc,
            cachedCg: score.cg,
            cachedChampionPoints: score.championPoints,
            cachedChangePenalty: score.changePenalty,
            cachedTotal: score.total,
            scoreUpdatedAt: now,
          },
        });
        updated++;
      }),
    );
  }

  return { updated, errors };
}

// Reads pre-computed scores from TournamentMember — instant, no API calls.
// Falls back to real-time computation when no scores have been cached yet
// (e.g. first deploy before the cron runs).
export async function buildGlobalLeaderboard(): Promise<GlobalLeaderboardRow[]> {
  const cachedCount = await prisma.tournamentMember.count({
    where: { scoreUpdatedAt: { not: null } },
  });

  if (cachedCount === 0) {
    return buildGlobalLeaderboardRealtime();
  }

  const members = await prisma.tournamentMember.findMany({
    where: {
      scoreUpdatedAt: { not: null },
      tournament: { competition: { not: null } },
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      tournament: { select: { id: true, name: true } },
    },
  });

  const bestByUser = new Map<string, GlobalLeaderboardRow>();

  for (const member of members) {
    const existing = bestByUser.get(member.userId);
    if (!existing || member.cachedTotal > existing.total) {
      bestByUser.set(member.userId, {
        rank: 0,
        userId: member.userId,
        displayName: displayName(member.user.firstName, member.user.lastName),
        bestTournamentId: member.tournament.id,
        bestTournamentName: member.tournament.name,
        fg: member.cachedFg,
        pg: member.cachedPg,
        sc: member.cachedSc,
        cg: member.cachedCg,
        championPoints: member.cachedChampionPoints,
        changePenalty: member.cachedChangePenalty,
        total: member.cachedTotal,
      });
    }
  }

  const rows = [...bestByUser.values()];
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.displayName.localeCompare(b.displayName, "ro");
  });
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

async function buildGlobalLeaderboardRealtime(): Promise<GlobalLeaderboardRow[]> {
  const tournaments = await prisma.tournament.findMany({
    where: { competition: { not: null } },
    include: {
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      bettingOdds: true,
    },
  });

  const bestByUser = new Map<string, GlobalLeaderboardRow>();

  for (const tournament of tournaments) {
    if (!tournament.competition) continue;
    const ctx = await loadTournamentContext(
      tournament.id,
      tournament.name,
      tournament.competition,
      tournament.bettingOdds?.payload ?? null,
    );
    if (!ctx) continue;

    for (const member of tournament.members) {
      const score = scoreUserInContext(ctx, member.userId);
      const name = displayName(member.user.firstName, member.user.lastName);
      const existing = bestByUser.get(member.userId);
      if (!existing || score.total > existing.total) {
        bestByUser.set(member.userId, {
          rank: 0,
          userId: member.userId,
          displayName: name,
          ...score,
        });
      }
    }
  }

  const rows = [...bestByUser.values()];
  rows.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.displayName.localeCompare(b.displayName, "ro");
  });
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
