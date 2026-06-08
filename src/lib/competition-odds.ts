import {
  fillEstimatedQualifyOdds,
  hasUsableMatchOdds,
  mergeBettingPayloads,
  parseBettingOddsPayload,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import { prisma } from "@/lib/prisma";

export type CompetitionOddsSnapshot = {
  competition: string;
  payload: BettingOddsPayload | null;
  fetchedAt: Date | null;
  lastManualRefreshAt: Date | null;
  oddsSource: string | null;
};

function payloadMatchCount(payload: BettingOddsPayload | null): number {
  if (!payload) return 0;
  return Object.values(payload.matches).filter((row) => hasUsableMatchOdds(row)).length;
}

/** Alege cel mai complet snapshot legacy per competiție. */
export async function bestLegacyTournamentOddsPayload(
  competition: string,
): Promise<BettingOddsPayload | null> {
  const tournaments = await prisma.tournament.findMany({
    where: { competition },
    include: { bettingOdds: true },
  });

  let best: BettingOddsPayload | null = null;
  let bestCount = -1;

  for (const t of tournaments) {
    const parsed = parseBettingOddsPayload(t.bettingOdds?.payload ?? null);
    const count = payloadMatchCount(parsed);
    if (count > bestCount) {
      best = parsed;
      bestCount = count;
    }
  }

  return best;
}

/** Cote partajate pentru competiție, cu fallback la snapshot-uri vechi per party. */
export async function loadCompetitionOddsSnapshot(
  competition: string,
): Promise<CompetitionOddsSnapshot> {
  const row = await prisma.competitionBettingOdds.findUnique({
    where: { competition },
  });

  const shared = parseBettingOddsPayload(row?.payload ?? null);
  const legacy = await bestLegacyTournamentOddsPayload(competition);

  const merged =
    shared && legacy ?
      mergeBettingPayloads(shared, legacy)
    : shared ?? legacy;
  const payload = merged ? fillEstimatedQualifyOdds(merged) : null;

  return {
    competition,
    payload,
    fetchedAt: row?.fetchedAt ?? null,
    lastManualRefreshAt: row?.lastManualRefreshAt ?? null,
    oddsSource: row?.oddsSource ?? null,
  };
}
