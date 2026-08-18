import type { FootballDataMatch } from "@/lib/football-data-types";

/** Meci jucat / decis oficial — contează la scoring & închiderea turneului. */
export function isMatchSettled(match: Pick<FootballDataMatch, "status">): boolean {
  const st = match.status;
  return st === "FINISHED" || st === "AWARDED";
}

export function isMatchPostponed(match: Pick<FootballDataMatch, "status">): boolean {
  return match.status === "POSTPONED";
}

export function isMatchCancelled(match: Pick<FootballDataMatch, "status">): boolean {
  return match.status === "CANCELLED";
}

/**
 * Amânat oficial SAU încă SCHEDULED/TIMED la >4h după kickoff
 * (API-ul uneori nu marchează POSTPONED imediat — ex. SuperLiga).
 */
export function isMatchEffectivelyPostponed(
  match: Pick<FootballDataMatch, "status" | "utcDate">,
  nowMs = Date.now(),
): boolean {
  if (isMatchPostponed(match)) return true;
  const st = match.status ?? "";
  if (st !== "SCHEDULED" && st !== "TIMED" && st !== "") return false;
  const kick = Date.parse(match.utcDate);
  if (!Number.isFinite(kick)) return false;
  return nowMs - kick > 4 * 60 * 60 * 1000;
}

/**
 * Anulat: nu blochează închiderea turneului și nu mai așteaptă scor.
 * (Amânat rămâne „deschis” până se joacă.)
 */
export function isMatchVoidForTournament(
  match: Pick<FootballDataMatch, "status">,
): boolean {
  return isMatchCancelled(match);
}

/** Live sau terminat — kickoff-ul „a trecut” în sens de joc. */
export function isMatchLiveOrFinished(
  match: Pick<FootballDataMatch, "status">,
): boolean {
  const st = match.status;
  return (
    st === "IN_PLAY" ||
    st === "PAUSED" ||
    st === "LIVE" ||
    st === "FINISHED" ||
    st === "AWARDED"
  );
}

/**
 * Timestamp pentru sortarea meciurilor „upcoming”.
 * Amânările cu dată veche (în trecut) merg la coadă, ca să nu apară ca „următoarele”.
 */
export function matchUpcomingSortTime(
  match: Pick<FootballDataMatch, "status" | "utcDate">,
  nowMs = Date.now(),
): number {
  const t = Date.parse(match.utcDate);
  if (isMatchEffectivelyPostponed(match, nowMs) && (!Number.isFinite(t) || t <= nowMs)) {
    return Number.MAX_SAFE_INTEGER - 1;
  }
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

export function matchStatusBadge(
  match: Pick<FootballDataMatch, "status" | "utcDate">,
  nowMs = Date.now(),
): { label: string; tone: "postponed" | "cancelled" | "live" } | null {
  if (isMatchCancelled(match)) return { label: "Anulat", tone: "cancelled" };
  if (isMatchEffectivelyPostponed(match, nowMs)) {
    return { label: "Amânat", tone: "postponed" };
  }
  if (match.status === "IN_PLAY" || match.status === "PAUSED" || match.status === "LIVE") {
    return { label: "LIVE", tone: "live" };
  }
  return null;
}
