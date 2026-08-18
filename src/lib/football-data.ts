/**
 * Football-Data.org API v4
 * @see https://www.football-data.org/documentation/quickstart
 * Snapshot first — pagina nu așteaptă API-ul.
 */

import "server-only";

import { cache } from "react";
import {
  formatStoredCompetition,
  type FootballDataCompetitionPickerOption,
} from "@/lib/competition";
import {
  coalesceInflight,
  fetchFootballDataJson,
} from "@/lib/football-data-rate-limit";
import {
  isSnapshotFresh,
  readFdSnapshot,
  readFdSnapshotSync,
  writeFdSnapshot,
} from "@/lib/football-data-snapshot";
import {
  matchGroupToGroupKey,
  stageDisplayName,
  venueLabel,
} from "@/lib/football-data-helpers";
import type {
  FootballDataMatch,
  FootballDataTeam,
  GroupStanding,
  StandingTableRow,
} from "@/lib/football-data-types";

export { matchGroupToGroupKey, stageDisplayName, venueLabel };
export type {
  FootballDataMatch,
  FootballDataScore,
  FootballDataTeam,
  GroupStanding,
  StandingTableRow,
} from "@/lib/football-data-types";

const BASE_URL = "https://api.football-data.org/v4";

export type { FootballDataCompetitionPickerOption } from "@/lib/competition";

/** Group-stage matches without a recognised `group` field. */
export const UNASSIGNED_GROUP_KEY = "Unassigned";

type MatchesEnvelope = {
  matches?: FootballDataMatch[];
  resultSet?: { count?: number };
};

export function getFootballDataToken(): string {
  const token =
    process.env.FOOTBALL_DATA_TOKEN?.trim() ||
    process.env.FOOTBALL_API_KEY?.trim();
  if (!token) {
    throw new Error(
      "Missing Football-Data token: set FOOTBALL_DATA_TOKEN or FOOTBALL_API_KEY in `.env` (X-Auth-Token).",
    );
  }
  return token;
}

async function fdFetch<T>(
  path: string,
  searchParams?: Record<string, string>,
  options?: { fresh?: boolean; revalidate?: number },
): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }

  const revalidateSeconds =
    options?.revalidate ?? (process.env.WC_LIVE_MODE === "true" ? 180 : 900);

  return fetchFootballDataJson<T>(url.toString(), getFootballDataToken(), {
    fresh: options?.fresh,
    revalidate: revalidateSeconds,
  });
}

/**
 * Suprascrieri manuale de oră de start (matchId -> utcDate ISO). Folosite când
 * furnizorul are data greșită sau meciul a fost reprogramat. Șterge intrarea
 * după ce trece meciul.
 */
const KICKOFF_OVERRIDES: Record<number, string> = {
  // UTA Arad – Rapid: furnizorul îl are pe 08.08, dar meciul se joacă azi 07.08 la 21:00 RO.
  566720: "2026-08-07T18:00:00Z",
};

function applyKickoffOverrides(matches: FootballDataMatch[]): FootballDataMatch[] {
  return matches.map((m) => {
    const override = KICKOFF_OVERRIDES[m.id];
    return override ? { ...m, utcDate: override } : m;
  });
}

function matchesSnapshotKey(code: string, season: string): string {
  return `matches:${code}:${season}`;
}

function liveSnapshotKey(code: string, season: string): string {
  return `live:${code}:${season}`;
}

/** Meci care ar putea fi live acum — ca să nu cerem IN_PLAY degeaba. */
export function matchMayBeLiveNow(
  match: Pick<FootballDataMatch, "status" | "utcDate">,
  nowMs = Date.now(),
): boolean {
  const st = match.status ?? "";
  if (st === "FINISHED" || st === "AWARDED" || st === "CANCELLED") return false;
  if (st === "IN_PLAY" || st === "PAUSED") return true;
  const kick = Date.parse(match.utcDate);
  if (!Number.isFinite(kick)) return false;
  return nowMs >= kick - 20 * 60 * 1000 && nowMs <= kick + 3.5 * 60 * 60 * 1000;
}

export function competitionMayHaveLiveNow(
  matches: Pick<FootballDataMatch, "status" | "utcDate">[],
  nowMs = Date.now(),
): boolean {
  return matches.some((m) => matchMayBeLiveNow(m, nowMs));
}

function matchesCacheTtlMs(matches: FootballDataMatch[]): number {
  if (matches.some((m) => m.status === "IN_PLAY" || m.status === "PAUSED")) {
    return 75_000;
  }
  if (competitionMayHaveLiveNow(matches)) return 90_000;
  return 12 * 60 * 1000;
}

async function fetchCompetitionMatchesFromApi(
  code: string,
  season: string,
  fresh: boolean,
): Promise<FootballDataMatch[]> {
  const path = `/competitions/${code}/matches`;
  const collected: FootballDataMatch[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await fdFetch<MatchesEnvelope>(
      path,
      {
        season,
        limit: String(limit),
        offset: String(offset),
      },
      fresh ? { fresh: true } : { revalidate: 900 },
    );

    const batch = data.matches ?? [];
    collected.push(...batch);

    const total = data.resultSet?.count;
    if (batch.length < limit) break;
    if (total !== undefined && collected.length >= total) break;
    if (batch.length === 0) break;

    offset += limit;
  }

  const adjusted = applyKickoffOverrides(collected);
  adjusted.sort(
    (a, b) =>
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
  );
  return adjusted;
}

function hasMatchSnapshot(
  snap: { payload: FootballDataMatch[]; fetchedAt: Date } | null,
): snap is { payload: FootballDataMatch[]; fetchedAt: Date } {
  return snap != null && Array.isArray(snap.payload) && snap.payload.length > 0;
}

function refreshMatchesInBackground(code: string, season: string, cacheKey: string): void {
  void coalesceInflight(`fd-matches-bg:${cacheKey}`, async () => {
    try {
      const matches = await fetchCompetitionMatchesFromApi(code, season, false);
      await writeFdSnapshot(cacheKey, matches);
    } catch (e) {
      console.warn(
        `[football-data] refresh fundal eșuat pentru ${cacheKey}:`,
        e instanceof Error ? e.message : e,
      );
    }
  });
}

function serveMatchesSnapshot(
  payload: FootballDataMatch[],
  fetchedAt: Date,
  code: string,
  season: string,
  cacheKey: string,
): FootballDataMatch[] {
  if (!isSnapshotFresh(fetchedAt, matchesCacheTtlMs(payload))) {
    refreshMatchesInBackground(code, season, cacheKey);
  }
  return applyKickoffOverrides(payload);
}

async function loadCompetitionMatchesCached(
  competitionCode: string,
  seasonRaw: string,
  fresh: boolean,
): Promise<FootballDataMatch[]> {
  const code = competitionCode.trim().toUpperCase();
  const season = seasonRaw.trim();
  const cacheKey = matchesSnapshotKey(code, season);

  if (!fresh) {
    const mem = readFdSnapshotSync<FootballDataMatch[]>(cacheKey);
    if (hasMatchSnapshot(mem)) {
      return serveMatchesSnapshot(mem.payload, mem.fetchedAt, code, season, cacheKey);
    }
  }

  return coalesceInflight(`fd-matches:${cacheKey}:${fresh ? "fresh" : "ttl"}`, async () => {
    const snap = await readFdSnapshot<FootballDataMatch[]>(cacheKey);
    if (!fresh && hasMatchSnapshot(snap)) {
      return serveMatchesSnapshot(snap.payload, snap.fetchedAt, code, season, cacheKey);
    }

    try {
      const matches = await fetchCompetitionMatchesFromApi(code, season, fresh);
      await writeFdSnapshot(cacheKey, matches);
      return matches;
    } catch (e) {
      if (hasMatchSnapshot(snap)) {
        console.warn(
          `[football-data] folosim snapshot vechi pentru ${cacheKey}:`,
          e instanceof Error ? e.message : e,
        );
        return applyKickoffOverrides(snap.payload);
      }
      throw e;
    }
  });
}

/**
 * Meciuri pentru o competiție + sezon. Citește snapshot Mongo dacă e proaspăt;
 * la 429/eroare întoarce ultimul snapshot, ca pagina să nu cadă.
 */
export const fetchCompetitionMatches = cache(
  async (competitionCode: string, season: string): Promise<FootballDataMatch[]> =>
    loadCompetitionMatchesCached(competitionCode, season, false),
);

/** Forțează refresh din API, dar tot scrie snapshot și cade pe stale dacă API-ul pică. */
export async function fetchCompetitionMatchesFresh(
  competitionCode: string,
  season: string,
): Promise<FootballDataMatch[]> {
  return loadCompetitionMatchesCached(competitionCode, season, true);
}

/**
 * Doar meciurile în desfășurare. Nu lovește API-ul pe calea request-ului dacă
 * avem snapshot de sezon / live — refresh-ul e în fundal.
 */
export async function fetchCompetitionLiveMatches(
  competitionCode: string,
  season: string,
): Promise<FootballDataMatch[]> {
  const code = competitionCode.trim().toUpperCase();
  const s = season.trim();
  const liveKey = liveSnapshotKey(code, s);
  const seasonKey = matchesSnapshotKey(code, s);

  function liveFromSeason(matches: FootballDataMatch[]): FootballDataMatch[] {
    return applyKickoffOverrides(matches).filter(
      (m) => m.status === "IN_PLAY" || m.status === "PAUSED",
    );
  }

  function refreshLiveInBackground(): void {
    void coalesceInflight(`fd-live-bg:${liveKey}`, async () => {
      try {
        const data = await fdFetch<MatchesEnvelope>(
          `/competitions/${code}/matches`,
          { season: s, status: "IN_PLAY,PAUSED" },
          { revalidate: 45 },
        );
        await writeFdSnapshot(liveKey, applyKickoffOverrides(data.matches ?? []));
      } catch (e) {
        console.warn(
          `[football-data] live refresh ${liveKey}:`,
          e instanceof Error ? e.message : e,
        );
      }
    });
  }

  const seasonMem = readFdSnapshotSync<FootballDataMatch[]>(seasonKey);
  if (seasonMem && Array.isArray(seasonMem.payload)) {
    if (!competitionMayHaveLiveNow(seasonMem.payload)) return [];
    const liveMem = readFdSnapshotSync<FootballDataMatch[]>(liveKey);
    if (liveMem && Array.isArray(liveMem.payload)) {
      if (!isSnapshotFresh(liveMem.fetchedAt, 45_000)) refreshLiveInBackground();
      return applyKickoffOverrides(liveMem.payload);
    }
    refreshLiveInBackground();
    return liveFromSeason(seasonMem.payload);
  }

  return coalesceInflight(`fd-live:${liveKey}`, async () => {
    const seasonSnap = await readFdSnapshot<FootballDataMatch[]>(seasonKey);
    if (seasonSnap && Array.isArray(seasonSnap.payload)) {
      if (!competitionMayHaveLiveNow(seasonSnap.payload)) return [];
      const liveSnap = await readFdSnapshot<FootballDataMatch[]>(liveKey);
      if (liveSnap && Array.isArray(liveSnap.payload)) {
        if (!isSnapshotFresh(liveSnap.fetchedAt, 45_000)) refreshLiveInBackground();
        return applyKickoffOverrides(liveSnap.payload);
      }
      refreshLiveInBackground();
      return liveFromSeason(seasonSnap.payload);
    }

    try {
      const data = await fdFetch<MatchesEnvelope>(
        `/competitions/${code}/matches`,
        { season: s, status: "IN_PLAY,PAUSED" },
        { revalidate: 45 },
      );
      const matches = applyKickoffOverrides(data.matches ?? []);
      await writeFdSnapshot(liveKey, matches);
      return matches;
    } catch (e) {
      const liveSnap = await readFdSnapshot<FootballDataMatch[]>(liveKey);
      if (liveSnap && Array.isArray(liveSnap.payload)) {
        console.warn(
          `[football-data] live snapshot pentru ${liveKey}:`,
          e instanceof Error ? e.message : e,
        );
        return applyKickoffOverrides(liveSnap.payload);
      }
      throw e;
    }
  });
}


type CompetitionsListEnvelope = {
  competitions?: Array<{
    code?: string;
    name?: string;
    emblem?: string;
    currentSeason?: { startDate?: string; endDate?: string };
  }>;
};

/**
 * Lista competițiilor disponibile în contul API (planul tău determină setul).
 * Memoizat pe request React.
 */
export const getFootballDataCompetitionPickerOptions = cache(
  async (): Promise<FootballDataCompetitionPickerOption[]> => {
    const data = await fdFetch<CompetitionsListEnvelope>("/competitions");
    const out: FootballDataCompetitionPickerOption[] = [];

    for (const c of data.competitions ?? []) {
      const code = c.code?.trim();
      const name = c.name?.trim();
      const start = c.currentSeason?.startDate;
      if (!code || !name || !start) continue;
      const y = Number(start.slice(0, 4));
      if (!Number.isFinite(y) || y < 1990 || y > 2100) continue;
      const season = String(y);
      const storageKey = formatStoredCompetition(code, y);
      const end = c.currentSeason?.endDate;
      const label =
        end ?
          `${name} (${season}/${String(Number(season) + 1).slice(2)})`
        : `${name} (${season})`;
      out.push({ storageKey, code, season, label });
    }

    out.sort((a, b) => a.label.localeCompare(b.label, "en"));
    return out;
  },
);


type RawStandings = {
  standings?: Array<{
    stage?: string | null;
    type?: string | null;
    group?: string | null;
    table?: StandingTableRow[];
  }>;
};

function mapStandingsPayload(data: RawStandings): GroupStanding[] {
  const result: GroupStanding[] = [];
  let ordinal = 0;

  for (const block of data.standings ?? []) {
    if (!block.table?.length) continue;
    if (block.type === "HOME" || block.type === "AWAY") continue;

    const stage = (block.stage ?? "").toString();
    const groupRaw = block.group;

    if (stage === "GROUP_STAGE" || (groupRaw && /^GROUP_/i.test(groupRaw))) {
      const gk =
        matchGroupToGroupKey(groupRaw) ??
        (groupRaw ? String(groupRaw).replace(/_/g, " ") : `Group ${ordinal + 1}`);
      const letter = String.fromCharCode(65 + (ordinal % 26));
      ordinal++;
      result.push({ letter, groupKey: gk, rows: block.table });
      continue;
    }

    if (result.length === 0) {
      result.push({ letter: "A", groupKey: "League", rows: block.table });
      break;
    }
  }

  return result;
}

/** Clasamente: snapshot întâi, API doar dacă lipsește cache-ul. */
export async function fetchPartyStandings(
  code: string,
  season: string,
  _matches: FootballDataMatch[],
): Promise<GroupStanding[]> {
  const c = code.trim().toUpperCase();
  const s = season.trim();
  const cacheKey = `standings:${c}:${s}`;

  const mem = readFdSnapshotSync<GroupStanding[]>(cacheKey);
  if (mem && Array.isArray(mem.payload) && mem.payload.length > 0) {
    return mem.payload;
  }

  const snap = await readFdSnapshot<GroupStanding[]>(cacheKey);
  if (snap && Array.isArray(snap.payload) && snap.payload.length > 0) {
    return snap.payload;
  }

  const data = await fdFetch<RawStandings>(`/competitions/${c}/standings`, {
    season: s,
  });
  const result = mapStandingsPayload(data);
  await writeFdSnapshot(cacheKey, result);
  return result;
}

const KNOCKOUT_STAGE_ORDER: string[] = [
  "LAST_64",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

export function sortKnockoutStageLabels(labels: string[]): string[] {
  const byStage = new Map(
    KNOCKOUT_STAGE_ORDER.map((s, i) => [stageDisplayName(s), i] as const),
  );
  return [...labels].sort((a, b) => {
    const ia = byStage.get(a);
    const ib = byStage.get(b);
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return a.localeCompare(b);
  });
}

/** Din meciuri GROUP_STAGE: teamId → „Group X” (4 echipe per grupă în CM). */
export function buildTeamIdToGroupKeyFromMatches(
  matches: FootballDataMatch[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of matches) {
    if ((m.stage ?? "") !== "GROUP_STAGE") continue;
    const gk = matchGroupToGroupKey(m.group);
    if (!gk) continue;
    const hid = m.homeTeam?.id;
    const aid = m.awayTeam?.id;
    if (hid !== undefined) map.set(hid, gk);
    if (aid !== undefined) map.set(aid, gk);
  }
  return map;
}

function flattenGroupStageStandingRows(data: {
  standings?: Array<{
    stage?: string;
    type?: string;
    group?: string | null;
    table?: StandingTableRow[];
  }>;
}): StandingTableRow[] {
  const byTeamId = new Map<number, StandingTableRow>();
  for (const block of data.standings ?? []) {
    if (block.stage !== "GROUP_STAGE" || !block.table?.length) continue;
    if (block.type && block.type !== "TOTAL") continue;
    for (const row of block.table) {
      const id = row.team?.id;
      if (id === undefined) continue;
      byTeamId.set(id, row);
    }
  }
  return [...byTeamId.values()];
}



export function partitionFootballDataMatches(matches: FootballDataMatch[]): {
  groups: Map<string, FootballDataMatch[]>;
  knockoutByStageLabel: Map<string, FootballDataMatch[]>;
} {
  const groups = new Map<string, FootballDataMatch[]>();
  const knockoutByStageLabel = new Map<string, FootballDataMatch[]>();

  for (const m of matches) {
    const stage = m.stage ?? "";

    if (stage === "GROUP_STAGE") {
      const key = matchGroupToGroupKey(m.group);
      if (key) {
        const list = groups.get(key) ?? [];
        list.push(m);
        groups.set(key, list);
        continue;
      }
      const list = groups.get(UNASSIGNED_GROUP_KEY) ?? [];
      list.push(m);
      groups.set(UNASSIGNED_GROUP_KEY, list);
      continue;
    }

    if (stage && stage !== "GROUP_STAGE") {
      const label = stageDisplayName(stage);
      const list = knockoutByStageLabel.get(label) ?? [];
      list.push(m);
      knockoutByStageLabel.set(label, list);
      continue;
    }

    const fallbackLabel = "Fixtures";
    const list = knockoutByStageLabel.get(fallbackLabel) ?? [];
    list.push(m);
    knockoutByStageLabel.set(fallbackLabel, list);
  }

  const sortByDate = (a: FootballDataMatch, b: FootballDataMatch) =>
    new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();

  for (const [, list] of groups) list.sort(sortByDate);
  for (const [, list] of knockoutByStageLabel) list.sort(sortByDate);

  return { groups, knockoutByStageLabel };
}

/** Echipe unice din lista de meciuri (pentru selectoare campion / calificări). */
export function collectTeamsFromMatches(
  matches: FootballDataMatch[],
): FootballDataTeam[] {
  const byId = new Map<number, FootballDataTeam>();
  for (const m of matches) {
    const hid = m.homeTeam?.id;
    const aid = m.awayTeam?.id;
    if (hid !== undefined) byId.set(hid, m.homeTeam);
    if (aid !== undefined) byId.set(aid, m.awayTeam);
  }
  return [...byId.values()].sort((a, b) => {
    const na = a.name ?? a.shortName ?? "";
    const nb = b.name ?? b.shortName ?? "";
    return na.localeCompare(nb, "en");
  });
}

/** team id → `Group X` from standings tables (for validation / UI limits). */
export function buildTeamIdToGroupKeyFromStandings(
  standings: GroupStanding[],
): Map<number, string> {
  const m = new Map<number, string>();
  for (const g of standings) {
    for (const row of g.rows) {
      const id = row.team?.id;
      if (id !== undefined) m.set(id, g.groupKey);
    }
  }
  return m;
}

type TeamsEnvelope = {
  teams?: FootballDataTeam[];
};

/** Echipe înscrise într-o competiție (ex. CM 2026). */
export async function fetchCompetitionTeams(
  competitionCode: string,
  season: string,
): Promise<FootballDataTeam[]> {
  const code = competitionCode.trim().toUpperCase();
  const s = season.trim();
  const cacheKey = `teams:${code}:${s}`;

  return coalesceInflight(`fd-${cacheKey}`, async () => {
    const mem = readFdSnapshotSync<FootballDataTeam[]>(cacheKey);
    if (mem && Array.isArray(mem.payload) && mem.payload.length > 0) {
      return mem.payload;
    }

    const snap = await readFdSnapshot<FootballDataTeam[]>(cacheKey);
    if (snap && Array.isArray(snap.payload) && snap.payload.length > 0) {
      if (!isSnapshotFresh(snap.fetchedAt, 24 * 60 * 60 * 1000)) {
        void coalesceInflight(`fd-bg:${cacheKey}`, async () => {
          try {
            const teams = await fetchTeamsFromApi(code, s);
            await writeFdSnapshot(cacheKey, teams);
          } catch (e) {
            console.warn(
              `[football-data] teams refresh ${cacheKey}:`,
              e instanceof Error ? e.message : e,
            );
          }
        });
      }
      return snap.payload;
    }

    try {
      const teams = await fetchTeamsFromApi(code, s);
      await writeFdSnapshot(cacheKey, teams);
      return teams;
    } catch (e) {
      throw e;
    }
  });
}

async function fetchTeamsFromApi(code: string, s: string): Promise<FootballDataTeam[]> {
  const data = await fdFetch<TeamsEnvelope>(`/competitions/${code}/teams`, {
    season: s,
  });
  return (data.teams ?? [])
    .filter((t): t is FootballDataTeam & { id: number; name: string } =>
      t.id != null && Boolean(t.name?.trim()),
    )
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "ro"));
}

/** Meciuri terminate recente pentru o echipă (toate competițiile). */
export async function fetchTeamFinishedMatches(
  teamId: number,
  limit = 10,
): Promise<FootballDataMatch[]> {
  const data = await fdFetch<MatchesEnvelope>(`/teams/${teamId}/matches`, {
    status: "FINISHED",
    limit: String(Math.min(Math.max(limit, 1), 50)),
  });
  const list = data.matches ?? [];
  list.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  return list;
}

type HeadToHeadEnvelope = {
  matches?: FootballDataMatch[];
  aggregates?: {
    numberOfMatches?: number;
    homeTeam?: FootballDataTeam;
    awayTeam?: FootballDataTeam;
    homeTeamWins?: number;
    awayTeamWins?: number;
    draws?: number;
  };
};

/** Meciuri directe între echipele unui fixture (Football-Data head2head). */
export async function fetchMatchHeadToHead(
  matchId: number,
  limit = 10,
): Promise<{ matches: FootballDataMatch[]; aggregates: HeadToHeadEnvelope["aggregates"] }> {
  const data = await fdFetch<HeadToHeadEnvelope>(`/matches/${matchId}/head2head`, {
    limit: String(Math.min(Math.max(limit, 1), 50)),
  });
  const list = data.matches ?? [];
  list.sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
  return { matches: list, aggregates: data.aggregates };
}
