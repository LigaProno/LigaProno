/** Valoare `Tournament.competition`: `{API_CODE}_{seasonStartYear}` (ex. `WC_2026`, `PL_2024`). */
export const COMPETITION_WC_2026 = "WC_2026";

/** Hardcoded picker option — avoids an API call on the tournaments page. */
export const COMPETITION_PICKER_OPTIONS: FootballDataCompetitionPickerOption[] = [
  { storageKey: COMPETITION_WC_2026, code: "WC", season: "2026", label: "FIFA World Cup (2026)" },
];

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
