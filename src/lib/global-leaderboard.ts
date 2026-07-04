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
  collectTeamsFromMatches,
  fetchCompetitionMatches,
  fetchPartyStandings,
  venueLabel,
  type FootballDataMatch,
  type GroupStanding,
} from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import {
  championLabelFromTeams,
  fixtureTlaPair,
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
  cg: number;
  championPoints: number;
  changePenalty: number;
  total: number;
  championPick: string | null;
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

function buildLeaderboardPredictionFields(
  userId: string,
  memberData: TournamentMemberData,
  competitionCtx: CompetitionScoringContext,
): Pick<GlobalLeaderboardRow, "championPick" | "correctScoreCount" | "lastMatch"> {
  const allTeams = collectTeamsFromMatches(competitionCtx.matches);
  const extra = memberData.extraByUser.get(userId) ?? null;
  const pmap = memberData.predsByUser.get(userId) ?? new Map();
  const totals = computeUserWcTotals(
    pmap,
    extra,
    competitionCtx.matches,
    competitionCtx.standings,
    competitionCtx.oddsMaps,
    memberData.changeCountByUser.get(userId) ?? 0,
  );

  const { lastFinished } = lastFinishedAndNextThree(competitionCtx.matches);
  const lastScores = lastFinished ? matchResultHtFt(lastFinished) : null;
  const lastMatch =
    lastFinished ?
      {
        matchId: lastFinished.id,
        fixture: fixtureTlaPair(lastFinished),
        pred: getMatchPredDisplay(pmap.get(lastFinished.id) ?? null, lastFinished),
        actualHt: lastScores?.ht ?? null,
        actualFt: lastScores?.ft ?? null,
      }
    : null;

  return {
    championPick: championLabelFromTeams(extra?.championTeamId ?? null, allTeams),
    correctScoreCount: totals.correctScoreCount,
    lastMatch,
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
          .map((row) => ({
            userId: row.userId,
            displayName: row.displayName,
            pred: getMatchPredDisplay(
              memberDataByTournament
                .get(row.bestTournamentId)
                ?.predsByUser.get(row.userId)
                ?.get(nm.id) ?? null,
              nm,
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
    standings = [];
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
      predAdvancingTeamId: p.predAdvancingTeamId,
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
): Pick<
  GlobalLeaderboardRow,
  | "bestTournamentId"
  | "bestTournamentName"
  | "fg"
  | "pg"
  | "sc"
  | "cg"
  | "championPoints"
  | "changePenalty"
  | "total"
> {
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

type UserBestEntry = {
  row: GlobalLeaderboardRow;
  tournamentId: string;
  competition: string;
  memberData: TournamentMemberData;
  competitionCtx: CompetitionScoringContext;
};

async function findUserBestGlobalEntry(memberUserId: string): Promise<UserBestEntry | null> {
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

  let best: UserBestEntry | null = null;

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
    );
    const predictionFields = buildLeaderboardPredictionFields(
      member.userId,
      memberData,
      competitionCtx,
    );
    const candidate: GlobalLeaderboardRow = {
      rank: 0,
      userId: member.userId,
      displayName: displayName(member.user.firstName, member.user.lastName),
      bestTournamentCompetition: tournament.competition,
      ...score,
      ...predictionFields,
    };

    if (!best || candidate.total > best.row.total) {
      best = {
        row: candidate,
        tournamentId: tournament.id,
        competition: tournament.competition,
        memberData,
        competitionCtx,
      };
    }
  }

  return best;
}

export async function loadGlobalMemberPredictions(memberUserId: string): Promise<{
  tournamentId: string;
  tournamentName: string;
  memberDisplayName: string;
  championPick: string | null;
  advancingCount: number;
  rows: { match: FootballDataMatch; pred: MatchPredictionInput }[];
  loadError: string | null;
} | null> {
  const best = await findUserBestGlobalEntry(memberUserId);
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

  const pmap = best.memberData.predsByUser.get(memberUserId) ?? new Map();
  const extra = best.memberData.extraByUser.get(memberUserId) ?? null;
  const allTeams = collectTeamsFromMatches(matches.length > 0 ? matches : best.competitionCtx.matches);
  const championPick = championLabelFromTeams(extra?.championTeamId ?? null, allTeams);

  const rows = [...(matches.length > 0 ? matches : best.competitionCtx.matches)]
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
    .filter((m) => hasAnyMatchPrediction(pmap.get(m.id)))
    .map((m) => ({
      match: m,
      pred: pmap.get(m.id)!,
    }));

  return {
    tournamentId: best.tournamentId,
    tournamentName: best.row.bestTournamentName,
    memberDisplayName: best.row.displayName,
    championPick,
    advancingCount: extra?.advancingTeamIds?.length ?? 0,
    rows,
    loadError,
  };
}

// Calculează live (ca pagina de turneu) — cache-ul din DB poate fi incomplet sau învechit.
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
      );
      const predictionFields = buildLeaderboardPredictionFields(
        member.userId,
        memberData,
        competitionCtx,
      );
      const name = displayName(member.user.firstName, member.user.lastName);
      const candidate: GlobalLeaderboardRow = {
        rank: 0,
        userId: member.userId,
        displayName: name,
        bestTournamentCompetition: tournament.competition,
        ...score,
        ...predictionFields,
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
