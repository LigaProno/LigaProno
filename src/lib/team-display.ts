import type { FootballDataTeam } from "@/lib/football-data";

const CITY_SUFFIX_RE =
  /\s+(București|Bucuresti|Bucharest|Bukarest|Cluj-Napoca|Cluj|Timișoara|Timisoara|Iași|Iasi|Constanța|Constanta)$/i;

/**
 * TLA-urile Football-Data pentru Liga 1 sunt nesigure (Rapid = „BUK”, Petrolul = „P52”…),
 * așa că le mapăm la coduri recognoscibile. Cheia e TLA-ul din API (stabil, chiar dacă urât).
 */
const TLA_OVERRIDES: Record<string, string> = {
  FCS: "FCSB", // FCSB Bukarest
  BUK: "RAP", // FC Rapid București
  CLU: "CFR", // CFR Cluj
  P52: "PET", // Petrolul Ploiești
  GAL: "OTE", // Oțelul Galați
  FCO: "FAR", // Farul Constanța
  UCR: "CRA", // Universitatea Craiova
  FCU: "UCJ", // FC Universitatea Cluj
};

/** Nume afișat scurt — override-uri Liga 1, apoi preferă TLA/short curat. */
export function formatTeamDisplayName(team: FootballDataTeam | undefined): string {
  if (!team) return "—";

  const full = team.name?.trim() ?? "";
  const short = team.shortName?.trim() ?? "";
  const tla = team.tla?.trim() ?? "";

  const override = tla ? TLA_OVERRIDES[tla] : undefined;
  if (override) return override;

  const combined = `${full} ${short}`.toLowerCase();
  if (/fcsb|steaua bucure|steaua buk/.test(combined)) {
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
