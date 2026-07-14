/** Hardcoded picker option — avoids an API call on the tournaments page. */
export const COMPETITION_PICKER_OPTIONS: FootballDataCompetitionPickerOption[] = [
  { storageKey: "PL_2026", code: "PL", season: "2026", label: "Premier League (2026–27)", maxMatchday: 38 },
  { storageKey: "PD_2026", code: "PD", season: "2026", label: "La Liga (2026–27)", maxMatchday: 38 },
  { storageKey: "FL1_2026", code: "FL1", season: "2026", label: "Ligue 1 (2026–27)", maxMatchday: 34 },
  { storageKey: "BL1_2026", code: "BL1", season: "2026", label: "Bundesliga (2026–27)", maxMatchday: 34 },
  { storageKey: "SA_2026", code: "SA", season: "2026", label: "Serie A (2026–27)", maxMatchday: 38 },
  { storageKey: "RL1_2026", code: "RL1", season: "2026", label: "SuperLiga României (2026–27)", maxMatchday: 30 },
];

/** Opțiune pentru select la creare / setare competiție (fără dependențe server-only). */
export type FootballDataCompetitionPickerOption = {
  storageKey: string;
  code: string;
  season: string;
  label: string;
  maxMatchday?: number;
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

/** Rezolvă cheia stocată (ex. RL1_2026) → opțiune picker; fallback prima competiție. */
export function findCompetitionPickerOption(
  storageKey: string | null | undefined,
): FootballDataCompetitionPickerOption {
  const key = storageKey?.trim();
  if (key) {
    const found = COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === key);
    if (found) return found;
  }
  return COMPETITION_PICKER_OPTIONS[0];
}

