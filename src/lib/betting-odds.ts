export const BETTING_ODDS_SCHEMA_VERSION = 1 as const;

/** Cotă folosită când scorul exact nu e în tabel (ex. 7-2); piețele listeză doar liniile uzuale. */
export const CORRECT_SCORE_OTHER_ODD = 50;

export type Odds1x2Outcome = "HOME" | "DRAW" | "AWAY";

/** Cote 1X2 la pauză / final pentru un meci (format zecimal). */
export type MatchOddsRow = {
  ht1x2: Record<Odds1x2Outcome, number>;
  ft1x2: Record<Odds1x2Outcome, number>;
  /** Chei „home-away”, ex. „2-1”. */
  correctScore: Record<string, number>;
  /** Calificare din meci eliminatoriu (gazde / oaspeți). */
  toAdvance?: { home: number; away: number } | null;
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

/**
 * Estimează cota de calificare din grupe pornind de la cota de campion.
 * OddsPortal nu publică piața de calificare; Gemini o lasă des null.
 */
export function estimateQualifyOddFromOutright(outrightWinner: number): number {
  const o = Math.max(1.01, outrightWinner);
  return clampOdd(Math.max(1.03, Math.min(15, Math.pow(o, 0.38))));
}

/** Completează toQualifyFromGroup lipsă folosind outrightWinner (sau o cotă implicită). */
export function fillEstimatedQualifyOdds(
  payload: BettingOddsPayload,
  defaultQualifyOdd = 3.5,
): BettingOddsPayload {
  const teams: Record<string, TeamOddsRow> = {};
  for (const [id, row] of Object.entries(payload.teams)) {
    if (row.toQualifyFromGroup != null) {
      teams[id] = row;
      continue;
    }
    const estimated =
      row.outrightWinner != null
        ? estimateQualifyOddFromOutright(row.outrightWinner)
        : defaultQualifyOdd;
    teams[id] = { ...row, toQualifyFromGroup: estimated };
  }
  return { ...payload, teams };
}

export function countTeamsWithQualifyOdds(payload: BettingOddsPayload): number {
  return Object.values(payload.teams).filter((r) => r.toQualifyFromGroup != null).length;
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

function normalizeToAdvance(src: unknown): { home: number; away: number } | null {
  if (!src || typeof src !== "object") return null;
  const o = src as Record<string, unknown>;
  const home = o.home ?? o.HOME;
  const away = o.away ?? o.AWAY;
  if (typeof home !== "number" || typeof away !== "number") return null;
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home: clampOdd(home), away: clampOdd(away) };
}

export function normalizeMatchOddsRow(raw: unknown): MatchOddsRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    ht1x2: normalizeOutcomeRecord(o.ht1x2),
    ft1x2: normalizeOutcomeRecord(o.ft1x2),
    correctScore: normalizeCorrectScore(o.correctScore),
    toAdvance: normalizeToAdvance(o.toAdvance),
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
function allOutcomesAreOne(row: Record<Odds1x2Outcome, number>): boolean {
  return row.HOME === 1 && row.DRAW === 1 && row.AWAY === 1;
}

/** True dacă rândul pare să vină dintr-o sursă reală (nu doar fallback ×1). */
export function hasUsableMatchOdds(row: MatchOddsRow | null | undefined): boolean {
  if (!row) return false;
  if (!allOutcomesAreOne(row.ft1x2)) return true;
  if (!allOutcomesAreOne(row.ht1x2)) return true;
  return Object.keys(row.correctScore).length >= 3;
}

/** Păstrează doar meciurile cu cote reale (exclude placeholder-ele ×1). */
export function filterUsableMatchOdds(
  matches: Record<string, MatchOddsRow>,
): Record<string, MatchOddsRow> {
  const out: Record<string, MatchOddsRow> = {};
  for (const [id, row] of Object.entries(matches)) {
    if (hasUsableMatchOdds(row)) out[id] = row;
  }
  return out;
}

function mergeTeamOddsRow(preferred: TeamOddsRow, fallback?: TeamOddsRow): TeamOddsRow {
  const fb = fallback ?? { toQualifyFromGroup: null, outrightWinner: null };
  return {
    toQualifyFromGroup: preferred.toQualifyFromGroup ?? fb.toQualifyFromGroup,
    outrightWinner: preferred.outrightWinner ?? fb.outrightWinner,
  };
}

/**
 * Combină două snapshot-uri: valorile din `preferred` au prioritate când sunt utilizabile,
 * altfel se păstrează `fallback` (util la refresh parțial OddsPortal + completare Gemini).
 */
export function mergeBettingPayloads(
  preferred: BettingOddsPayload,
  fallback: BettingOddsPayload,
): BettingOddsPayload {
  const matchIds = new Set([
    ...Object.keys(preferred.matches),
    ...Object.keys(fallback.matches),
  ]);
  const matches: Record<string, MatchOddsRow> = {};
  for (const id of matchIds) {
    const p = preferred.matches[id];
    const f = fallback.matches[id];
    if (p && hasUsableMatchOdds(p)) matches[id] = p;
    else if (f && hasUsableMatchOdds(f)) matches[id] = f;
    else if (p) matches[id] = p;
    else if (f) matches[id] = f;
  }

  const teamIds = new Set([
    ...Object.keys(preferred.teams),
    ...Object.keys(fallback.teams),
  ]);
  const teams: Record<string, TeamOddsRow> = {};
  for (const id of teamIds) {
    teams[id] = mergeTeamOddsRow(
      preferred.teams[id] ?? { toQualifyFromGroup: null, outrightWinner: null },
      fallback.teams[id],
    );
  }

  return {
    schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
    matches,
    teams,
  };
}

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
  return {
    schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
    matches,
    teams,
  };
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

/** Cotă pentru scor exact: linie din tabel sau {@link CORRECT_SCORE_OTHER_ODD} dacă lipsește. */
export function lookupCorrectScoreOdd(
  row: MatchOddsRow | null | undefined,
  home: number,
  away: number,
): number {
  if (!row) return 1;
  const table = row.correctScore;
  if (Object.keys(table).length === 0) return 1;

  const keys = [
    scorelineKey(home, away),
    `${home} - ${away}`,
    `${home}:${away}`,
  ].map((k) => k.replace(/\s+/g, "").toLowerCase());
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
  return CORRECT_SCORE_OTHER_ODD;
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

/** Estimează cote „cine trece mai departe” din 1X2 final (inclusiv egal → prelungiri). */
export function estimateToAdvanceFromFt1x2(
  ft: Record<Odds1x2Outcome, number>,
): { home: number; away: number } {
  const ih = 1 / Math.max(ft.HOME, 1.01);
  const id = 1 / Math.max(ft.DRAW, 1.01);
  const ia = 1 / Math.max(ft.AWAY, 1.01);
  const sum = ih + id + ia;
  const pH = ih / sum + 0.5 * (id / sum);
  const pA = ia / sum + 0.5 * (id / sum);
  const norm = pH + pA;
  return {
    home: clampOdd(Math.max(1.01, 1 / (pH / norm))),
    away: clampOdd(Math.max(1.01, 1 / (pA / norm))),
  };
}

export function lookupMatchToAdvanceOdd(
  row: MatchOddsRow | null | undefined,
  homeTeamId: number | null | undefined,
  awayTeamId: number | null | undefined,
  advancingTeamId: number,
): number {
  if (!row) return 1;
  let adv = row.toAdvance;
  if (!adv || adv.home < 1.01 || adv.away < 1.01) {
    adv = estimateToAdvanceFromFt1x2(row.ft1x2);
  }
  if (advancingTeamId === homeTeamId) return adv.home;
  if (advancingTeamId === awayTeamId) return adv.away;
  return 1;
}

/** Completează toAdvance lipsă pentru meciurile eliminatorii (din ft1x2). */
export function fillEstimatedToAdvanceOdds(
  payload: BettingOddsPayload,
  knockoutMatchIds: Iterable<number>,
): BettingOddsPayload {
  const koSet = new Set(knockoutMatchIds);
  const matches: Record<string, MatchOddsRow> = { ...payload.matches };
  for (const [idStr, row] of Object.entries(matches)) {
    const id = Number(idStr);
    if (!koSet.has(id)) continue;
    if (row.toAdvance?.home != null && row.toAdvance?.away != null) continue;
    matches[idStr] = {
      ...row,
      toAdvance: estimateToAdvanceFromFt1x2(row.ft1x2),
    };
  }
  return { ...payload, matches };
}
