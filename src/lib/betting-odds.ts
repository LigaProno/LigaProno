export const BETTING_ODDS_SCHEMA_VERSION = 1 as const;

export type Odds1x2Outcome = "HOME" | "DRAW" | "AWAY";

/** Cote 1X2 la pauză / final pentru un meci (format zecimal). */
export type MatchOddsRow = {
  ht1x2: Record<Odds1x2Outcome, number>;
  ft1x2: Record<Odds1x2Outcome, number>;
  /** Chei „home-away”, ex. „2-1”. */
  correctScore: Record<string, number>;
};

export type TeamOddsRow = {
  /** Cotă „calificare din grupă” (top 2 + loc 3 unde e cazul). */
  toQualifyFromGroup: number | null;
  /** Cotă câștigător final al competiției. */
  outrightWinner: number | null;
};

export type BettingOddsPayload = {
  schemaVersion: typeof BETTING_ODDS_SCHEMA_VERSION;
  matches: Record<string, MatchOddsRow>;
  teams: Record<string, TeamOddsRow>;
};

export type TournamentOddsMaps = {
  matchById: Map<number, MatchOddsRow>;
  teamById: Map<number, TeamOddsRow>;
};

const OUTCOMES: Odds1x2Outcome[] = ["HOME", "DRAW", "AWAY"];

function clampOdd(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 1;
  if (raw < 1) return 1;
  if (raw > 200) return 200;
  return raw;
}

function normalizeOutcomeRecord(
  src: unknown,
): Record<Odds1x2Outcome, number> {
  const out: Partial<Record<Odds1x2Outcome, number>> = {};
  if (src && typeof src === "object") {
    const o = src as Record<string, unknown>;
    for (const k of OUTCOMES) {
      if (o[k] !== undefined) out[k] = clampOdd(o[k]);
    }
  }
  for (const k of OUTCOMES) {
    if (out[k] === undefined) out[k] = 1;
  }
  return out as Record<Odds1x2Outcome, number>;
}

function normalizeCorrectScore(src: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (src && typeof src === "object") {
    for (const [k, v] of Object.entries(src as Record<string, unknown>)) {
      const key = k.replace(/\s+/g, "").toLowerCase();
      if (!/^\d+-\d+$/.test(key)) continue;
      out[key] = clampOdd(v);
    }
  }
  return out;
}

function normalizeTeamRow(src: unknown): TeamOddsRow {
  if (!src || typeof src !== "object") {
    return { toQualifyFromGroup: null, outrightWinner: null };
  }
  const o = src as Record<string, unknown>;
  const q = o.toQualifyFromGroup;
  const w = o.outrightWinner;
  return {
    toQualifyFromGroup:
      typeof q === "number" && Number.isFinite(q) ? clampOdd(q) : null,
    outrightWinner:
      typeof w === "number" && Number.isFinite(w) ? clampOdd(w) : null,
  };
}

export function normalizeMatchOddsRow(raw: unknown): MatchOddsRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    ht1x2: normalizeOutcomeRecord(o.ht1x2),
    ft1x2: normalizeOutcomeRecord(o.ft1x2),
    correctScore: normalizeCorrectScore(o.correctScore),
  };
}

export function parseBettingOddsPayload(raw: unknown): BettingOddsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ver = Number(o.schemaVersion);
  if (Number.isFinite(ver) && ver !== BETTING_ODDS_SCHEMA_VERSION) {
    return null;
  }
  const matches: Record<string, MatchOddsRow> = {};
  const teams: Record<string, TeamOddsRow> = {};

  if (o.matches && typeof o.matches === "object") {
    for (const [id, row] of Object.entries(o.matches as Record<string, unknown>)) {
      const n = normalizeMatchOddsRow(row);
      if (n) matches[id] = n;
    }
  }
  if (o.teams && typeof o.teams === "object") {
    for (const [id, row] of Object.entries(o.teams as Record<string, unknown>)) {
      teams[id] = normalizeTeamRow(row);
    }
  }
  return { schemaVersion: BETTING_ODDS_SCHEMA_VERSION, matches, teams };
}

/** Normalizează toate valorile numerice după un răspuns Gemini. */
export function sanitizeBettingPayload(input: BettingOddsPayload): BettingOddsPayload {
  const matches: Record<string, MatchOddsRow> = {};
  for (const [k, v] of Object.entries(input.matches)) {
    const n = normalizeMatchOddsRow(v);
    if (n) matches[k] = n;
  }
  const teams: Record<string, TeamOddsRow> = {};
  for (const [k, v] of Object.entries(input.teams)) {
    teams[k] = normalizeTeamRow(v);
  }
  return { schemaVersion: BETTING_ODDS_SCHEMA_VERSION, matches, teams };
}

export function payloadToOddsMaps(
  payload: BettingOddsPayload | null,
): TournamentOddsMaps | null {
  if (!payload) return null;
  const matchById = new Map<number, MatchOddsRow>();
  for (const [k, row] of Object.entries(payload.matches)) {
    const id = Number(k);
    if (Number.isFinite(id)) matchById.set(id, row);
  }
  const teamById = new Map<number, TeamOddsRow>();
  for (const [k, row] of Object.entries(payload.teams)) {
    const id = Number(k);
    if (Number.isFinite(id)) teamById.set(id, row);
  }
  return { matchById, teamById };
}

export function scorelineKey(home: number, away: number): string {
  return `${home}-${away}`;
}

/** Cotă pentru scor exact: încearcă mai multe variații de cheie. */
export function lookupCorrectScoreOdd(
  row: MatchOddsRow | null | undefined,
  home: number,
  away: number,
): number {
  if (!row) return 1;
  const keys = [
    scorelineKey(home, away),
    `${home} - ${away}`,
    `${home}:${away}`,
  ].map((k) => k.replace(/\s+/g, "").toLowerCase());
  const table = row.correctScore;
  for (const k of keys) {
    const v = table[k] ?? table[k.replace(/-/g, "—")];
    if (typeof v === "number" && Number.isFinite(v)) return clampOdd(v);
  }
  for (const [k, v] of Object.entries(table)) {
    const m = k.match(/^(\d+)[-:](\d+)$/);
    if (m && Number(m[1]) === home && Number(m[2]) === away) {
      return clampOdd(v);
    }
  }
  return 1;
}

export function lookup1x2Odd(
  row: MatchOddsRow | null | undefined,
  which: "ht1x2" | "ft1x2",
  outcome: Odds1x2Outcome,
): number {
  if (!row) return 1;
  return clampOdd(row[which][outcome]);
}

export function lookupTeamQualifyOdd(
  maps: TournamentOddsMaps | null | undefined,
  teamId: number,
): number {
  const row = maps?.teamById.get(teamId);
  const q = row?.toQualifyFromGroup;
  return q != null && q >= 1 ? clampOdd(q) : 1;
}

export function lookupTeamOutrightOdd(
  maps: TournamentOddsMaps | null | undefined,
  teamId: number,
): number {
  const row = maps?.teamById.get(teamId);
  const w = row?.outrightWinner;
  return w != null && w >= 1 ? clampOdd(w) : 1;
}
