/**
 * Football-Data.org API v4
 * @see https://www.football-data.org/documentation/quickstart
 * Endpoint exemplu: GET /v4/competitions/WC/matches?season=2026
 */

import { cache } from "react";
import {
  formatStoredCompetition,
  type FootballDataCompetitionPickerOption,
} from "@/lib/competition";

const BASE_URL = "https://api.football-data.org/v4";

export type { FootballDataCompetitionPickerOption } from "@/lib/competition";

/** Group-stage matches without a recognised `group` field. */
export const UNASSIGNED_GROUP_KEY = "Unassigned";

export type FootballDataTeam = {
  id?: number;
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

/** Scor din API (meciuri terminate / în desfășurare). */
export type FootballDataScore = {
  winner?: string | null;
  duration?: string | null;
  fullTime?: { home?: number | null; away?: number | null };
  halfTime?: { home?: number | null; away?: number | null };
  /** Scor după 90 de minute — prezent la meciuri eliminatorii cu prelungiri / penalty-uri. */
  regularTime?: { home?: number | null; away?: number | null };
  extraTime?: { home?: number | null; away?: number | null };
  penalties?: { home?: number | null; away?: number | null };
};

/** Formă minimală din răspunsul la `/competitions/{code}/matches`. */
export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status?: string;
  stage?: string;
  group?: string | null;
  matchday?: number | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  venue?: string | { name?: string; city?: string | null } | null;
  score?: FootballDataScore | null;
};

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

function venueLabel(m: FootballDataMatch): string | null {
  const v = m.venue;
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  const parts = [v.name, v.city].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export { venueLabel };

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
    options?.revalidate ?? (process.env.WC_LIVE_MODE === "true" ? 300 : 900);

  const res = await fetch(url.toString(), {
    headers: {
      "X-Auth-Token": getFootballDataToken(),
      Accept: "application/json",
    },
    ...(options?.fresh ?
      { cache: "no-store" as const }
    : { next: { revalidate: revalidateSeconds } }),
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Football-Data: response was not JSON (HTTP ${res.status}).`);
  }

  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message?: string }).message)
        : text.slice(0, 200);
    throw new Error(`Football-Data ${res.status}: ${msg}`);
  }

  return body as T;
}

/**
 * Meciuri pentru o competiție + sezon (paginare limit/offset).
 */
export async function fetchCompetitionMatches(
  competitionCode: string,
  season: string,
): Promise<FootballDataMatch[]> {
  const code = competitionCode.trim().toUpperCase();
  const path = `/competitions/${code}/matches`;
  const collected: FootballDataMatch[] = [];
  let offset = 0;
  const limit = 100;

  /* eslint-disable no-constant-condition */
  while (true) {
    const data = await fdFetch<MatchesEnvelope>(path, {
      season: season.trim(),
      limit: String(limit),
      offset: String(offset),
    });

    const batch = data.matches ?? [];
    collected.push(...batch);

    const total = data.resultSet?.count;
    if (batch.length < limit) break;
    if (total !== undefined && collected.length >= total) break;
    if (batch.length === 0) break;

    offset += limit;
  }

  collected.sort(
    (a, b) =>
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
  );

  return collected;
}

/** Meciuri fără cache HTTP — pentru actualizare bracket KO după grupe. */
export async function fetchCompetitionMatchesFresh(
  competitionCode: string,
  season: string,
): Promise<FootballDataMatch[]> {
  const code = competitionCode.trim().toUpperCase();
  const path = `/competitions/${code}/matches`;
  const collected: FootballDataMatch[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const data = await fdFetch<MatchesEnvelope>(
      path,
      {
        season: season.trim(),
        limit: String(limit),
        offset: String(offset),
      },
      { fresh: true },
    );

    const batch = data.matches ?? [];
    collected.push(...batch);

    const total = data.resultSet?.count;
    if (batch.length < limit) break;
    if (total !== undefined && collected.length >= total) break;
    if (batch.length === 0) break;

    offset += limit;
  }

  collected.sort(
    (a, b) =>
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(),
  );

  return collected;
}

/**
 * Doar meciurile în desfășurare (IN_PLAY = live, PAUSED = pauză) ale competiției.
 * Cache scurt (60s) și partajat: Football-Data e lovit cel mult o dată/60s per
 * competiție, indiferent câți useri deschid pagina — sub limita de ~10 req/min.
 */
export async function fetchCompetitionLiveMatches(
  competitionCode: string,
  season: string,
): Promise<FootballDataMatch[]> {
  const code = competitionCode.trim().toUpperCase();
  const data = await fdFetch<MatchesEnvelope>(
    `/competitions/${code}/matches`,
    { season: season.trim(), status: "IN_PLAY,PAUSED" },
    { revalidate: 60 },
  );
  return data.matches ?? [];
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


/** Clasamente pentru party: citește `/standings` și mapează blocuri TOTAL / GROUP_STAGE. */
export async function fetchPartyStandings(
  code: string,
  season: string,
  matches: FootballDataMatch[],
): Promise<GroupStanding[]> {
  const c = code.trim().toUpperCase();
  const s = season.trim();

  type RawStandings = {
    standings?: Array<{
      stage?: string | null;
      type?: string | null;
      group?: string | null;
      table?: StandingTableRow[];
    }>;
  };

  const data = await fdFetch<RawStandings>(
    `/competitions/${c}/standings`,
    { season: s },
  );

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
      result.push({
        letter: "A",
        groupKey: "League",
        rows: block.table,
      });
      break;
    }
  }

  return result;
}

/** Mapare `stage` (enum API) → titlu afișat. */
export function stageDisplayName(stage: string): string {
  const map: Record<string, string> = {
    REGULAR_SEASON: "Regular season",
    PRELIMINARY_ROUND: "Preliminary round",
    QUALIFICATION: "Qualification",
    QUALIFICATION_ROUND_1: "Qualification R1",
    QUALIFICATION_ROUND_2: "Qualification R2",
    QUALIFICATION_ROUND_3: "Qualification R3",
    PLAYOFF_ROUND_1: "Play-off R1",
    PLAYOFF_ROUND_2: "Play-off R2",
    PLAYOFFS: "Play-offs",
    GROUP_STAGE: "Group stage",
    LAST_64: "Round of 64",
    LAST_32: "Round of 32",
    LAST_16: "Round of 16",
    QUARTER_FINALS: "Quarter-finals",
    SEMI_FINALS: "Semi-finals",
    THIRD_PLACE: "Third place",
    FINAL: "Final",
  };
  return map[stage] ?? stage;
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

/** Grupă după `GROUP_STAGE` + `group`; altfel după fază (knockout). */
/** Rând clasament (grupă). */
export type StandingTableRow = {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type GroupStanding = {
  /** Literă grupă A–L */
  letter: string;
  /** ex. „Group A” */
  groupKey: string;
  rows: StandingTableRow[];
};


/**
 * Normalizează `group` din meciuri: `GROUP_A`, uneori doar `A`.
 */
export function matchGroupToGroupKey(
  groupRaw: string | null | undefined,
): string | null {
  if (!groupRaw?.trim()) return null;
  const gu = groupRaw.trim().toUpperCase();
  let m = gu.match(/^GROUP_([A-Z])$/);
  if (m) return `Group ${m[1]}`;
  m = gu.match(/^([A-Z])$/);
  if (m) return `Group ${m[1]}`;
  return null;
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
  const data = await fdFetch<TeamsEnvelope>(`/competitions/${code}/teams`, {
    season: season.trim(),
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
