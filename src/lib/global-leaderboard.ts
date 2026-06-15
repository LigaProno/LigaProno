import {
  isWorldCup2026Storage,
  parseStoredCompetition,
} from "@/lib/competition";
import { loadCompetitionOddsSnapshot } from "@/lib/competition-odds";
import {
  payloadToOddsMaps,
  type BettingOddsPayload,
  type TournamentOddsMaps,
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

type CompetitionScoringContext = {
  matches: FootballDataMatch[];
  standings: GroupStanding[];
  oddsMaps: TournamentOddsMaps | undefined;
};

type TournamentMemberData = {
  predsByUser: Map<string, Map<number, MatchPredictionInput>>;
  extraByUser: Map<
    string,
    { advancingTeamIds: number[]; championTeamId: number | null }
  >;
  changeCountByUser: Map<string, number>;
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
    // API indisponibil — continuăm; punctele pe meciuri FINISHED rămân 0 până revine API-ul.
  }

  let standings: GroupStanding[] = [];
  try {
    standings = await fetchPartyStandings(parsed.code, parsed.season, matches);
  } catch {
    standings =
      isWorldCup2026Storage(competition) ? createEmptyWcGroupStandings() : [];
  }

  const oddsMaps = payloadToOddsMaps(oddsPayload);
  return {
    matches,
    standings,
    oddsMaps: oddsMaps ?? undefined,
  };
}

async function loadTournamentMemberData(
  tournamentId: string,
): Promise<TournamentMemberData> {
  const [wcMatchPreds, wcExtras, members] = await Promise.all([
    prisma.wcMatchPrediction.findMany({ where: { tournamentId } }),
    prisma.wcExtraPrediction.findMany({ where: { tournamentId } }),
    prisma.tournamentMember.findMany({
      where: { tournamentId },
      select: { userId: true, midCompetitionPredictionChangeCount: true },
    }),
  ]);

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

  return { predsByUser, extraByUser, changeCountByUser };
}

function scoreUser(
  userId: string,
  tournamentId: string,
  tournamentName: string,
  competitionCtx: CompetitionScoringContext,
  memberData: TournamentMemberData,
): Omit<GlobalLeaderboardRow, "rank" | "displayName" | "userId"> {
  const totals = computeUserWcTotals(
    memberData.predsByUser.get(userId) ?? new Map(),
    memberData.extraByUser.get(userId) ?? null,
    competitionCtx.matches,
    competitionCtx.standings,
    competitionCtx.oddsMaps,
    memberData.changeCountByUser.get(userId) ?? 0,
  );

  return {
    bestTournamentId: tournamentId,
    bestTournamentName: tournamentName,
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
      // skip competition on hard failure
    }
  }

  let updated = 0;
  let errors = 0;

  for (const tournament of tournaments) {
    if (!tournament.competition) continue;

    const competitionCtx = competitionCtxByKey.get(tournament.competition);
    if (!competitionCtx) {
      errors++;
      continue;
    }

    let memberData: TournamentMemberData;
    try {
      memberData = await loadTournamentMemberData(tournament.id);
    } catch {
      errors++;
      continue;
    }

    const now = new Date();
    await Promise.all(
      tournament.members.map(async (member) => {
        const score = scoreUser(
          member.userId,
          tournament.id,
          tournament.name,
          competitionCtx,
          memberData,
        );
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

// Calculează live (ca pagina de turneu) — cache-ul din DB poate fi incomplet sau învechit.
export async function buildGlobalLeaderboard(): Promise<GlobalLeaderboardRow[]> {
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

  for (const tournament of tournaments) {
    if (!tournament.competition) continue;

    const competitionCtx = competitionCtxByKey.get(tournament.competition);
    if (!competitionCtx) continue;

    const memberData = await loadTournamentMemberData(tournament.id);

    for (const member of tournament.members) {
      const score = scoreUser(
        member.userId,
        tournament.id,
        tournament.name,
        competitionCtx,
        memberData,
      );
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
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}
