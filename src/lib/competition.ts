/** Valoare `Tournament.competition`: `{API_CODE}_{seasonStartYear}` (ex. `WC_2026`, `PL_2024`). */
export const COMPETITION_WC_2026 = "WC_2026";

/** Liga 1 România 2025-2026 — fixtures fetched via Gemini (not football-data.org). */
export const COMPETITION_LIGA1_2025 = "PDL1_2025";

/** Opțiune pentru select la creare / setare competiție (fără dependențe server-only). */
export type FootballDataCompetitionPickerOption = {
  storageKey: string;
  code: string;
  season: string;
  label: string;
};

export function formatStoredCompetition(
  apiCode: string,
  seasonStartYear: number | string,
): string {
  const y =
    typeof seasonStartYear === "number" ?
      String(seasonStartYear)
    : String(seasonStartYear).trim();
  return `${apiCode.trim().toUpperCase()}_${y}`;
}

export function parseStoredCompetition(
  s: string | null | undefined,
): { code: string; season: string } | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  const m = /^([A-Z0-9]+)_(\d{4})$/i.exec(t);
  if (!m) return null;
  return { code: m[1].toUpperCase(), season: m[2] };
}

export function isWorldCup2026Storage(
  s: string | null | undefined,
): boolean {
  const p = parseStoredCompetition(s);
  return p?.code === "WC" && p.season === "2026";
}

export function isLiga1Storage(s: string | null | undefined): boolean {
  const p = parseStoredCompetition(s);
  return p?.code === "PDL1";
}

/** Hardcoded picker option for Liga1 (bypasses football-data.org). */
export const LIGA1_PICKER_OPTION: FootballDataCompetitionPickerOption = {
  storageKey: COMPETITION_LIGA1_2025,
  code: "PDL1",
  season: "2025",
  label: "Liga 1 România 2025-26 (experimental)",
};
