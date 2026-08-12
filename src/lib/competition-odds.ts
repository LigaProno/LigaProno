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

  // Snapshot-ul partajat e suficient pe path-ul interactiv — nu mai scanăm
  // toate turneele legacy la fiecare încărcare de pagină.
  if (shared && payloadMatchCount(shared) > 0) {
    return {
      competition,
      payload: fillEstimatedQualifyOdds(shared),
      fetchedAt: row?.fetchedAt ?? null,
      lastManualRefreshAt: row?.lastManualRefreshAt ?? null,
      oddsSource: row?.oddsSource ?? null,
    };
  }

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

/**
 * Încarcă și unește snapshot-urile de cote pentru una sau mai multe competiții
 * (turnee mix). `lastManualRefreshAt` = cel mai recent dintre chei.
 */
export async function loadTournamentOddsSnapshot(
  competitionKeys: string[],
): Promise<CompetitionOddsSnapshot | null> {
  const keys = [...new Set(competitionKeys.map((k) => k.trim()).filter(Boolean))];
  if (keys.length === 0) return null;
  if (keys.length === 1) {
    return loadCompetitionOddsSnapshot(keys[0]);
  }

  const snapshots = await Promise.all(keys.map((k) => loadCompetitionOddsSnapshot(k)));
  let mergedPayload: BettingOddsPayload | null = null;
  let fetchedAt: Date | null = null;
  let lastManualRefreshAt: Date | null = null;
  let oddsSource: string | null = null;

  for (const snap of snapshots) {
    if (snap.payload) {
      mergedPayload = mergedPayload
        ? mergeBettingPayloads(mergedPayload, snap.payload)
        : snap.payload;
    }
    if (snap.fetchedAt && (!fetchedAt || snap.fetchedAt > fetchedAt)) {
      fetchedAt = snap.fetchedAt;
    }
    if (
      snap.lastManualRefreshAt &&
      (!lastManualRefreshAt || snap.lastManualRefreshAt > lastManualRefreshAt)
    ) {
      lastManualRefreshAt = snap.lastManualRefreshAt;
    }
    if (!oddsSource && snap.oddsSource) oddsSource = snap.oddsSource;
  }

  return {
    competition: keys.join("+"),
    payload: mergedPayload ? fillEstimatedQualifyOdds(mergedPayload) : null,
    fetchedAt,
    lastManualRefreshAt,
    oddsSource,
  };
}
