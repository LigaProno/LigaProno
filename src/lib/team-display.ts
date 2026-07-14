import type { FootballDataTeam } from "@/lib/football-data";

const CITY_SUFFIX_RE =
  /\s+(București|Bucuresti|Bucharest|Bukarest|Cluj-Napoca|Cluj|Timișoara|Timisoara|Iași|Iasi|Constanța|Constanta)$/i;

/** Nume afișat scurt — FCSB fără „București”, preferă TLA când e clar. */
export function formatTeamDisplayName(team: FootballDataTeam | undefined): string {
  if (!team) return "—";

  const full = team.name?.trim() ?? "";
  const short = team.shortName?.trim() ?? "";
  const tla = team.tla?.trim() ?? "";

  const combined = `${full} ${short}`.toLowerCase();
  if (/fcsb|steaua bucure|steaua buk/.test(combined) || tla === "FCS") {
    return "FCSB";
  }

  if (tla && tla.length <= 5 && tla !== full) {
    return tla;
  }

  if (short && short.length <= 14) {
    return short.replace(CITY_SUFFIX_RE, "").trim() || short;
  }

  if (full) {
    const stripped = full.replace(CITY_SUFFIX_RE, "").trim();
    if (/^fcsb/i.test(stripped)) return "FCSB";
    return stripped || full;
  }

  return tla || "?";
}
