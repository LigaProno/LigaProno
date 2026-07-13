export type TournamentPrize = { place: number; prize: string };

export const PRIZE_OPTIONS = [
  "Tricou fotbal Cupa Mondială 2026",
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
