/** Hardcoded picker option — avoids an API call on the tournaments page. */
export const COMPETITION_PICKER_OPTIONS: FootballDataCompetitionPickerOption[] = [
  { storageKey: "PL_2025", code: "PL", season: "2025", label: "Premier League (2025–26)" },
  { storageKey: "PD_2025", code: "PD", season: "2025", label: "La Liga (2025–26)" },
  { storageKey: "FL1_2025", code: "FL1", season: "2025", label: "Ligue 1 (2025–26)" },
  { storageKey: "BL1_2025", code: "BL1", season: "2025", label: "Bundesliga (2025–26)" },
  { storageKey: "SA_2025", code: "SA", season: "2025", label: "Serie A (2025–26)" },
  { storageKey: "RL1_2025", code: "RL1", season: "2025", label: "SuperLiga României (2025–26)" },
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

