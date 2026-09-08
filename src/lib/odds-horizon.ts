import {
  hasCompleteMatchOdds,
  hasUsableMatchOdds,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import type { FootballDataMatch } from "@/lib/football-data-types";

/** Include meciuri începute de curând (live) fără cote complete. */
export const ODDS_HORIZON_PAST_MS = 12 * 60 * 60 * 1000;
/** Două–trei etape înainte, ca pronosticurile să aibă cote înainte de kick-off. */
export const ODDS_HORIZON_FUTURE_MS = 21 * 24 * 60 * 60 * 1000;
/** Meciuri terminate recente fără tabel CS — încă merită completate. */
export const ODDS_FINISHED_BACKFILL_MS = 7 * 24 * 60 * 60 * 1000;

function hasKnownTeams(m: FootballDataMatch): boolean {
  return (
    m.homeTeam?.id != null &&
    m.awayTeam?.id != null &&
    Boolean(m.homeTeam.name ?? m.homeTeam.shortName) &&
    Boolean(m.awayTeam.name ?? m.awayTeam.shortName)
  );
}

export function isMatchInOddsHorizon(
  m: FootballDataMatch,
  nowMs = Date.now(),
): boolean {
  if (m.status === "CANCELLED" || m.status === "POSTPONED") return false;
  const kick = Date.parse(m.utcDate);
  if (!Number.isFinite(kick)) return false;
  return kick >= nowMs - ODDS_HORIZON_PAST_MS && kick <= nowMs + ODDS_HORIZON_FUTURE_MS;
}

export function matchesInOddsHorizon(
  matches: FootballDataMatch[],
  nowMs = Date.now(),
): FootballDataMatch[] {
  return matches.filter(
    (m) =>
      hasKnownTeams(m) &&
      m.status !== "FINISHED" &&
      m.status !== "AWARDED" &&
      isMatchInOddsHorizon(m, nowMs),
  );
}

/** True dacă meciul a început deja (sau e terminat) la momentul dat. */
function isKickoffPassed(m: FootballDataMatch, nowMs: number): boolean {
  const kick = Date.parse(m.utcDate);
  return Number.isFinite(kick) && kick <= nowMs;
}

/**
 * Meciuri ale căror cote nu mai au voie să se schimbe: au început deja și au
 * cote reale în snapshot. Punctajul trebuie să rămână cel calculat cu cotele
 * de la fluierul de start, altfel clasamentul se rescrie la fiecare refresh.
 *
 * Meciurile amânate rămân deschise — se rejoacă la altă dată, cu altă piață.
 */
export function lockedOddsMatchIds(
  matches: FootballDataMatch[],
  payload: BettingOddsPayload | null,
  nowMs = Date.now(),
): Set<string> {
  const locked = new Set<string>();
  if (!payload) return locked;
  for (const m of matches) {
    if (m.status === "CANCELLED" || m.status === "POSTPONED") continue;
    if (!isKickoffPassed(m, nowMs)) continue;
    if (!hasUsableMatchOdds(payload.matches[String(m.id)])) continue;
    locked.add(String(m.id));
  }
  return locked;
}

/**
 * Meciuri pentru care trebuie trase cote: fereastra upcoming + terminate recente
 * fără 1X2/CS complete.
 */
export function matchesNeedingOddsFill(
  matches: FootballDataMatch[],
  payload: BettingOddsPayload | null,
  nowMs = Date.now(),
): FootballDataMatch[] {
  return matches.filter((m) => {
    if (m.status === "CANCELLED" || m.status === "POSTPONED") return false;
    if (!hasKnownTeams(m)) return false;
    const row = payload?.matches[String(m.id)];
    if (hasCompleteMatchOdds(row)) return false;

    const kick = Date.parse(m.utcDate);
    if (!Number.isFinite(kick)) return false;

    if (m.status === "FINISHED" || m.status === "AWARDED") {
      return nowMs - kick < ODDS_FINISHED_BACKFILL_MS;
    }
    return isMatchInOddsHorizon(m, nowMs);
  });
}
