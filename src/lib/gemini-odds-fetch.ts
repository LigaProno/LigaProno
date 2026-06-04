import type { FootballDataMatch } from "@/lib/football-data";
import {
  type BettingOddsPayload,
  BETTING_ODDS_SCHEMA_VERSION,
  type MatchOddsRow,
  type TeamOddsRow,
} from "@/lib/betting-odds";

const DEFAULT_MODEL = "gemini-2.5-flash";
const MATCH_BATCH = 28;

/** Implicit activ: `GEMINI_ODDS_USE_GOOGLE_SEARCH=false` îl dezactivează. */
function isGoogleSearchGroundingEnabled(): boolean {
  const v = (process.env.GEMINI_ODDS_USE_GOOGLE_SEARCH ?? "true")
    .trim()
    .toLowerCase();
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

export function getGeminiApiKey(): string {
  const k = process.env.GEMINI_API_KEY?.trim();
  if (!k) {
    throw new Error("Lipsește GEMINI_API_KEY în `.env` pentru actualizarea cotelor.");
  }
  return k;
}

function extractGeminiTextParts(data: unknown): string {
  if (!data || typeof data !== "object") throw new Error("Răspuns Gemini invalid.");
  const root = data as Record<string, unknown>;
  const candidates = root.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Gemini: niciun candidat în răspuns.");
  }
  const c0 = candidates[0] as Record<string, unknown>;
  const content = c0.content as Record<string, unknown> | undefined;
  const parts = content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error("Gemini: conținut gol.");
  }
  const chunks: string[] = [];
  for (const part of parts) {
    if (part && typeof part === "object" && "text" in part) {
      const t = (part as { text?: string }).text;
      if (typeof t === "string" && t.trim()) chunks.push(t.trim());
    }
  }
  if (chunks.length === 0) throw new Error("Gemini: lipsă text în răspuns.");
  return chunks.join("\n").trim();
}

/** Elimină eventualul ```json ... ``` din jurul JSON-ului. */
function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  return s.trim();
}

/** Extrage obiect JSON din text (inclusiv când Gemini adaugă explicații). */
export function parseGeminiJsonText(jsonText: string): unknown {
  const trimmed = stripJsonFence(jsonText);
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Gemini: textul nu e JSON valid.");
  }
}

export async function callGeminiJson(
  apiKey: string,
  model: string,
  userPrompt: string,
  options?: { googleSearch?: boolean; timeoutMs?: number },
): Promise<unknown> {
  const googleSearch = options?.googleSearch ?? isGoogleSearchGroundingEnabled();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestBody: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.25,
      // responseMimeType + google_search grounding are mutually exclusive in Gemini API
      ...(googleSearch ? {} : { responseMimeType: "application/json" }),
    },
  };

  /** @see https://ai.google.dev/gemini-api/docs/google-search */
  if (googleSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(options?.timeoutMs ?? 90_000),
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Gemini HTTP ${res.status}: răspuns non-JSON.`);
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "error" in body
        ? JSON.stringify((body as { error?: unknown }).error)
        : text.slice(0, 400);
    throw new Error(`Gemini ${res.status}: ${msg}`);
  }
  const jsonText = extractGeminiTextParts(body);
  return parseGeminiJsonText(jsonText);
}

function teamListPrompt(
  teams: { id: number; name: string }[],
  competitionLabel: string,
): string {
  const lines = teams
    .map((t) => `${t.id}\t${t.name.replace(/\t/g, " ")}`)
    .join("\n");
  return `You are a sports betting odds assistant. Return ONLY valid JSON (no markdown, no prose outside JSON).

Competition: ${competitionLabel}

Teams (Football-Data numeric id TAB name):
${lines}

You have access to Google Search. You MUST run web searches now (bookmakers, odds portals, sports news with betting lines) and base every numeric odd on what you find online for this competition. If sources disagree slightly, pick a sensible consensus decimal line.

Return this exact shape:
{
  "schemaVersion": ${BETTING_ODDS_SCHEMA_VERSION},
  "teams": {
    "<teamId as string>": {
      "toQualifyFromGroup": <decimal odds for team to reach knockout from group stage, or null if not a group team>,
      "outrightWinner": <decimal odds to win the whole competition>
    }
  },
  "matches": {}
}

Rules:
- European decimal odds (e.g. 2.10). Each odds must be >= 1.01.
- Include every team id from the list in "teams".
- "matches" must be an empty object {}.
`;
}

function matchBatchPrompt(
  matches: FootballDataMatch[],
  competitionLabel: string,
): string {
  const lines = matches.map((m) => {
    const hid = m.homeTeam.id ?? 0;
    const aid = m.awayTeam.id ?? 0;
    const hn = (m.homeTeam.name ?? m.homeTeam.shortName ?? "Home").replace(/\t/g, " ");
    const an = (m.awayTeam.name ?? m.awayTeam.shortName ?? "Away").replace(/\t/g, " ");
    return `${m.id}\t${hid}\t${hn}\t${aid}\t${an}\t${m.utcDate}\t${m.stage ?? ""}`;
  });

  return `You are a sports betting odds assistant. Return ONLY valid JSON (no markdown, no prose outside JSON).

Competition: ${competitionLabel}

Each line: matchId TAB homeTeamId TAB homeName TAB awayTeamId TAB awayName TAB utcDate TAB stage
${lines.join("\n")}

You have access to Google Search. For each fixture, search the web for current 1X2 / correct-score style markets (or the closest available lines from major bookmakers or odds sites) and use those decimals. If a specific half-time 1X2 line is not published online, derive sensible HT 1X2 decimals consistent with the HT/FT patterns you find.

Return this exact shape:
{
  "schemaVersion": ${BETTING_ODDS_SCHEMA_VERSION},
  "matches": {
    "<matchId as string>": {
      "ht1x2": { "HOME": number, "DRAW": number, "AWAY": number },
      "ft1x2": { "HOME": number, "DRAW": number, "AWAY": number },
      "correctScore": { "0-0": number, "1-0": number, ... }
    }
  },
  "teams": {}
}

Rules:
- Decimal odds >= 1.01 for every number.
- ht1x2 = half-time 1X2, ft1x2 = full-time 1X2 for this fixture.
- correctScore: include odds for every scoreline with home goals 0-4 and away goals 0-4 (25 keys per match) using keys "h-a" like "2-1".
- "teams" must be an empty object {}.
- Cover every matchId from the input lines.
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
  };
}

function coercePayload(raw: unknown): BettingOddsPayload {
  if (!raw || typeof raw !== "object") {
    return {
      schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
      matches: {},
      teams: {},
    };
  }
  const o = raw as Record<string, unknown>;
  const matches =
    o.matches && typeof o.matches === "object" ?
      (o.matches as Record<string, MatchOddsRow>)
    : {};
  const teams =
    o.teams && typeof o.teams === "object" ?
      (o.teams as Record<string, TeamOddsRow>)
    : {};
  return {
    schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
    matches: { ...matches },
    teams: { ...teams },
  };
}

export type FetchBettingOddsResult = {
  payload: BettingOddsPayload;
  model: string;
  /** True dacă s-a trimis tool-ul google_search (Grounding with Google Search). */
  usedGoogleSearch: boolean;
};

/**
 * Construiește un snapshot de cote pentru competiție via Gemini.
 * Implicit folosește Grounding with Google Search ca modelul să poată căuta cote online.
 * Dezactivează cu GEMINI_ODDS_USE_GOOGLE_SEARCH=false dacă întâmpini erori de API sau limite de cost.
 */
export async function fetchBettingOddsViaGemini(
  competitionLabel: string,
  matches: FootballDataMatch[],
  teams: { id: number; name: string }[],
  options?: { model?: string; googleSearch?: boolean },
): Promise<FetchBettingOddsResult> {
  const apiKey = getGeminiApiKey();
  const model = (
    options?.model ?? (process.env.GEMINI_ODDS_MODEL?.trim() || DEFAULT_MODEL)
  ).trim();
  const googleSearch =
    options?.googleSearch ?? isGoogleSearchGroundingEnabled();

  let acc: BettingOddsPayload = {
    schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
    matches: {},
    teams: {},
  };

  if (teams.length > 0) {
    const raw = await callGeminiJson(apiKey, model, teamListPrompt(teams, competitionLabel), {
      googleSearch,
    });
    acc = mergePayload(acc, coercePayload(raw));
  }

  for (let i = 0; i < matches.length; i += MATCH_BATCH) {
    const chunk = matches.slice(i, i + MATCH_BATCH);
    const raw = await callGeminiJson(
      apiKey,
      model,
      matchBatchPrompt(chunk, competitionLabel),
      { googleSearch },
    );
    acc = mergePayload(acc, coercePayload(raw));
  }

  return { payload: acc, model, usedGoogleSearch: googleSearch };
}
