import {
  BETTING_ODDS_SCHEMA_VERSION,
  type BettingOddsPayload,
  type MatchOddsRow,
  type TeamOddsRow,
} from "@/lib/betting-odds";
import { callGeminiJson, getGeminiApiKey } from "@/lib/gemini-odds-fetch";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MATCH_BATCH = 20;

function model(): string {
  return (process.env.GEMINI_ODDS_MODEL?.trim() || DEFAULT_MODEL).trim();
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type Liga1Team = {
  id: number;
  name: string;
  shortName: string;
};

export type Liga1FixtureRaw = {
  matchId: number;
  matchday: number;
  homeTeamId: number;
  awayTeamId: number;
  /** ISO 8601 UTC string */
  utcDate: string;
};

export type Liga1FixturesResponse = {
  teams: Liga1Team[];
  fixtures: Liga1FixtureRaw[];
};

export type Liga1ResultItem = {
  matchId: number;
  confident: boolean;
  status: "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "PENDING";
  htHome?: number | null;
  htAway?: number | null;
  ftHome?: number | null;
  ftAway?: number | null;
};

// ---------------------------------------------------------------------------
// Fixture fetch (one-time, called when creator initialises Liga1 tournament)
// ---------------------------------------------------------------------------

function fixturesFetchPrompt(season: string, dateStr: string): string {
  return `You are a football fixtures assistant. Return ONLY valid JSON — no markdown, no prose outside JSON.

Use Google Search RIGHT NOW to find the Liga 1 România matches scheduled for ${dateStr}. Search for "Liga 1 Romania meciuri ${dateStr}" or "SuperLiga Romania ${dateStr} program".

Return ONLY the fixtures you find from the search. If no matches are found for today, return an empty fixtures array. Do NOT guess or invent fixtures.

Assign each team a unique stable integer ID in 9000001–9000020 (consistent per team name).
Assign each fixture a unique integer ID in 90000001–99999999.

{
  "teams": [
    { "id": 9000001, "name": "FCSB", "shortName": "FCS" }
  ],
  "fixtures": [
    {
      "matchId": 90000001,
      "matchday": 29,
      "homeTeamId": 9000001,
      "awayTeamId": 9000002,
      "utcDate": "${dateStr}T18:00:00Z"
    }
  ]
}

Rules:
- ONLY fixtures confirmed by your search for ${dateStr}. Zero hallucination.
- utcDate: ISO 8601 UTC. Romanian kickoff times are UTC+3 in summer (so 18:00 Bucharest = 15:00Z).
- Do NOT include score or result fields.
`;
}

export async function fetchLiga1FixturesViaGemini(
  season: string,
  forDate?: Date,
): Promise<Liga1FixturesResponse> {
  const apiKey = getGeminiApiKey();
  const d = forDate ?? new Date();
  const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
  // Google Search ON — needed to know today's actual fixtures (training data doesn't cover 2026 schedule)
  const raw = await callGeminiJson(apiKey, model(), fixturesFetchPrompt(season, dateStr), {
    googleSearch: true,
  });

  const o = raw as Record<string, unknown>;

  const teams: Liga1Team[] = [];
  if (Array.isArray(o.teams)) {
    for (const t of o.teams) {
      if (!t || typeof t !== "object") continue;
      const row = t as Record<string, unknown>;
      const id = Number(row.id);
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const shortName =
        typeof row.shortName === "string" ? row.shortName.trim() : name.slice(0, 3).toUpperCase();
      if (Number.isFinite(id) && id >= 9000001 && id <= 9000020 && name) {
        teams.push({ id, name, shortName });
      }
    }
  }

  const fixtures: Liga1FixtureRaw[] = [];
  const seenIds = new Set<number>();
  if (Array.isArray(o.fixtures)) {
    for (const f of o.fixtures) {
      if (!f || typeof f !== "object") continue;
      const row = f as Record<string, unknown>;
      const matchId = Number(row.matchId);
      const matchday = Number(row.matchday);
      const homeTeamId = Number(row.homeTeamId);
      const awayTeamId = Number(row.awayTeamId);
      const utcDate = typeof row.utcDate === "string" ? row.utcDate.trim() : "";
      if (
        !Number.isFinite(matchId) || matchId < 90000001 || matchId > 99999999 ||
        seenIds.has(matchId) ||
        !Number.isFinite(matchday) ||
        !Number.isFinite(homeTeamId) ||
        !Number.isFinite(awayTeamId) ||
        homeTeamId === awayTeamId ||
        !utcDate
      ) continue;
      seenIds.add(matchId);
      fixtures.push({ matchId, matchday, homeTeamId, awayTeamId, utcDate });
    }
  }

  return { teams, fixtures };
}

// ---------------------------------------------------------------------------
// Result fetch (called by cron for HT and FT windows)
// ---------------------------------------------------------------------------

type ResultFetchInput = {
  matchId: number;
  matchday: number;
  homeTeamName: string;
  awayTeamName: string;
  utcDate: string;
  needHt: boolean;
  needFt: boolean;
};

function resultFetchPrompt(fixtures: ResultFetchInput[], season: string): string {
  const lines = fixtures.map((f) =>
    `${f.matchId}\t${f.matchday}\t${f.homeTeamName} vs ${f.awayTeamName}\t${f.utcDate}\t${f.needHt ? "HT" : ""}${f.needFt ? "+FT" : ""}`,
  );

  return `You are a football results assistant. Return ONLY valid JSON — no markdown, no prose.

Liga 1 România season ${season}-${String(Number(season) + 1)}.

Search the web for the current scores of these specific matches:
${lines.join("\n")}
(Format: matchId TAB matchday TAB fixture TAB kickoffUTC TAB what_is_needed)

Return:
{
  "results": [
    {
      "matchId": 90000001,
      "confident": true,
      "status": "FINISHED",
      "htHome": 1,
      "htAway": 0,
      "ftHome": 2,
      "ftAway": 1
    }
  ]
}

Rules:
- status values: "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED"
- If you cannot find the result confidently, set "confident": false and omit score fields.
- htHome/htAway required if status is PAUSED or FINISHED.
- ftHome/ftAway required only if status is FINISHED.
- Include every matchId from the input, even if not confident.
`;
}

export async function fetchLiga1ResultsViaGemini(
  fixtures: ResultFetchInput[],
  season: string,
): Promise<Liga1ResultItem[]> {
  if (fixtures.length === 0) return [];

  const apiKey = getGeminiApiKey();
  const raw = await callGeminiJson(apiKey, model(), resultFetchPrompt(fixtures, season), {
    googleSearch: true,
  });

  const o = raw as Record<string, unknown>;
  const out: Liga1ResultItem[] = [];

  if (Array.isArray(o.results)) {
    for (const r of o.results) {
      if (!r || typeof r !== "object") continue;
      const row = r as Record<string, unknown>;
      const matchId = Number(row.matchId);
      if (!Number.isFinite(matchId)) continue;

      const confident = row.confident !== false;
      const status = (row.status as string | undefined) ?? "PENDING";

      const item: Liga1ResultItem = {
        matchId,
        confident,
        status: (["SCHEDULED", "IN_PLAY", "PAUSED", "FINISHED"].includes(status)
          ? status
          : "PENDING") as Liga1ResultItem["status"],
      };

      if (confident) {
        const htHome = row.htHome != null ? Number(row.htHome) : null;
        const htAway = row.htAway != null ? Number(row.htAway) : null;
        const ftHome = row.ftHome != null ? Number(row.ftHome) : null;
        const ftAway = row.ftAway != null ? Number(row.ftAway) : null;
        if (htHome != null && Number.isFinite(htHome)) item.htHome = htHome;
        if (htAway != null && Number.isFinite(htAway)) item.htAway = htAway;
        if (ftHome != null && Number.isFinite(ftHome)) item.ftHome = ftHome;
        if (ftAway != null && Number.isFinite(ftAway)) item.ftAway = ftAway;
      }

      out.push(item);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Odds fetch (adapted for Liga1 — uses internal IDs instead of football-data IDs)
// ---------------------------------------------------------------------------

type Liga1FixtureSimple = {
  matchId: number;
  matchday: number;
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  utcDate: string;
};

function liga1TeamListPrompt(
  teams: Liga1Team[],
  season: string,
): string {
  const lines = teams.map((t) => `${t.id}\t${t.name}`).join("\n");
  return `You are a sports betting odds assistant. Return ONLY valid JSON (no markdown).

Competition: Superliga României ${season}-${String(Number(season) + 1)} (also known as Liga 1 România).

Search NOW on Betano.ro, Unibet, Bet365, or Oddsportal for "Superliga Romania castigatoare sezon" or "Liga 1 Romania winner odds ${season}" to find outright winner odds for this season's title race.

Also search for the current Superliga standings table ("clasament Superliga ${season}").

Teams (internal id TAB name):
${lines}

Return:
{
  "schemaVersion": ${BETTING_ODDS_SCHEMA_VERSION},
  "teams": {
    "<teamId as string>": {
      "toQualifyFromGroup": null,
      "outrightWinner": <decimal odds for this team to win the Superliga title>
    }
  },
  "matches": {},
  "liga1Standings": [
    { "teamId": 9000001, "teamName": "FCSB", "position": 1 }
  ]
}

Rules:
- Use REAL decimal odds from bookmakers (e.g. 1.45, 3.20, 8.00, 25.00). DO NOT use 1.01 as a placeholder.
- If you cannot find a specific team's odds, estimate realistically based on their league position and form — a title contender might be 1.5–4.0, a mid-table team 15–50, a relegation candidate 100+.
- outrightWinner must reflect the remaining season (if the title is nearly decided, the leader might be 1.10–1.30).
- liga1Standings: all ${teams.length} teams, sorted by current league position 1–${teams.length}.
- "matches" must be {}.
- Include ALL ${teams.length} teams.
`;
}

function liga1MatchBatchPrompt(
  fixtures: Liga1FixtureSimple[],
  season: string,
): string {
  const lines = fixtures.map((f) => {
    const d = new Date(f.utcDate);
    const dateLabel = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    return `${f.matchId}\t${f.homeTeamName} vs ${f.awayTeamName}\t${dateLabel}`;
  });
  return `You are a sports betting odds assistant. Return ONLY valid JSON (no markdown).

Competition: Superliga României ${season}-${String(Number(season) + 1)} (Liga 1 România).

For each fixture below, search Betano.ro, Unibet, Bet365, or Oddsportal for the match odds. Search for "<home team> vs <away team> superliga odds" or "<home> <away> cote pariuri".

Fixtures (matchId TAB home vs away TAB date):
${lines.join("\n")}

Return:
{
  "schemaVersion": ${BETTING_ODDS_SCHEMA_VERSION},
  "matches": {
    "<matchId as string>": {
      "ht1x2": { "HOME": number, "DRAW": number, "AWAY": number },
      "ft1x2": { "HOME": number, "DRAW": number, "AWAY": number },
      "correctScore": { "0-0": number, "1-0": number, "1-1": number, "2-0": number, "2-1": number, "0-1": number, "0-2": number, "1-2": number, "2-2": number, "3-0": number, "3-1": number, "3-2": number, "0-3": number, "1-3": number, "2-3": number, "3-3": number, "4-0": number, "4-1": number, "4-2": number, "4-3": number, "0-4": number, "1-4": number, "2-4": number, "3-4": number, "4-4": number }
    }
  },
  "teams": {}
}

Rules:
- Use REAL decimal odds from bookmakers. DO NOT use 1.01 as a placeholder — that is wrong.
- Realistic ft1x2 example for an even match: HOME 2.40, DRAW 3.20, AWAY 2.90.
- Realistic ft1x2 example for a heavy favourite: HOME 1.35, DRAW 4.50, AWAY 7.00.
- ht1x2: half-time 1X2. If not available on bookmakers, derive from ft1x2 — HT draw is most common (~40–50%), adjust HOME/AWAY based on ft odds.
- correctScore: provide realistic odds for all 25 scorelines (home 0–4, away 0–4). Most likely scores (1-0, 1-1, 2-0, 2-1) should be lower odds (6–12), unlikely scores (4-4, 4-3) should be higher (100–300).
- "teams" must be {}.
- Cover ALL ${fixtures.length} fixtures.
`;
}

function mergePayload(
  a: BettingOddsPayload,
  b: Partial<BettingOddsPayload>,
): BettingOddsPayload {
  return {
    schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
    matches: { ...a.matches, ...(b.matches ?? {}) },
    teams: { ...a.teams, ...(b.teams ?? {}) },
    ...(b.liga1Standings ? { liga1Standings: b.liga1Standings } : a.liga1Standings ? { liga1Standings: a.liga1Standings } : {}),
  };
}

function coercePayload(raw: unknown): BettingOddsPayload {
  if (!raw || typeof raw !== "object") {
    return { schemaVersion: BETTING_ODDS_SCHEMA_VERSION, matches: {}, teams: {} };
  }
  const o = raw as Record<string, unknown>;
  return {
    schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
    matches: o.matches && typeof o.matches === "object" ? (o.matches as Record<string, MatchOddsRow>) : {},
    teams: o.teams && typeof o.teams === "object" ? (o.teams as Record<string, TeamOddsRow>) : {},
    liga1Standings: Array.isArray(o.liga1Standings) ? (o.liga1Standings as BettingOddsPayload["liga1Standings"]) : undefined,
  };
}

export type FetchLiga1OddsResult = {
  payload: BettingOddsPayload;
  model: string;
};

export async function fetchLiga1OddsViaGemini(
  teams: Liga1Team[],
  fixtures: Liga1FixtureSimple[],
  season: string,
): Promise<FetchLiga1OddsResult> {
  const apiKey = getGeminiApiKey();
  const m = model();

  let acc: BettingOddsPayload = {
    schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
    matches: {},
    teams: {},
  };

  if (teams.length > 0) {
    const raw = await callGeminiJson(apiKey, m, liga1TeamListPrompt(teams, season), { googleSearch: true });
    acc = mergePayload(acc, coercePayload(raw));
  }

  for (let i = 0; i < fixtures.length; i += MATCH_BATCH) {
    const chunk = fixtures.slice(i, i + MATCH_BATCH);
    const raw = await callGeminiJson(apiKey, m, liga1MatchBatchPrompt(chunk, season), { googleSearch: true });
    acc = mergePayload(acc, coercePayload(raw));
  }

  return { payload: acc, model: m };
}
