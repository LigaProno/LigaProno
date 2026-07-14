export type TournamentPrize = { place: number; prize: string };

export const PRIZE_OPTIONS = [
  "Tricouri de fotbal Cupa Mondiala 2026",
  "Minge fotbal oficială",
  "Card cadou 50 RON",
  "Card cadou 100 RON",
  "Card cadou 200 RON",
  "Bilet meci fotbal",
] as const;

export function parsePrizes(raw: unknown): TournamentPrize[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).filter(
    (p): p is TournamentPrize =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as TournamentPrize).place === "number" &&
      typeof (p as TournamentPrize).prize === "string",
  );
}

export function placeLabel(place: number): string {
  if (place === 1) return "Locul 1";
  if (place === 2) return "Locul 2";
  if (place === 3) return "Locul 3";
  return `Locul ${place}`;
}

/** Text compact pentru afișare: „Tricouri…, Card cadou 50 RON” sau un singur premiu repetat. */
export function formatPrizesDisplay(prizes: TournamentPrize[]): string {
  const texts = [...prizes]
    .sort((a, b) => a.place - b.place)
    .map((p) => p.prize.trim())
    .filter(Boolean);
  if (texts.length === 0) return "";
  const unique = [...new Set(texts)];
  if (unique.length === 1) return unique[0];
  return texts.join(", ");
}
