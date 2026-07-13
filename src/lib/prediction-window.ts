import type { FootballDataMatch } from "@/lib/football-data";

/**
 * Competiția e considerată „începută" dacă există cel puțin un meci cu status de desfășurare/rezultat
 * sau a cărui dată de start (utcDate) a trecut deja.
 */
export function isCompetitionUnderway(
  matches: FootballDataMatch[],
  now = new Date(),
): boolean {
  const t = now.getTime();
  for (const m of matches) {
    const st = m.status;
    if (
      st === "IN_PLAY" ||
      st === "PAUSED" ||
      st === "FINISHED" ||
      st === "AWARDED"
    ) {
      return true;
    }
    const kick = Date.parse(m.utcDate);
    if (!Number.isNaN(kick) && kick <= t) return true;
  }
  return false;
}
