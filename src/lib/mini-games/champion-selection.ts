import { CHAMPION_PLAYERS } from "@/data/mini-games/champions";
import { TRIVIA_ROTATION_ANCHOR } from "./trivia-selection";

const MASTER_SEED = "pronohub-champion-master-v1";

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function daysSinceAnchor(dateKey: string, anchorKey: string): number {
  const parse = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.floor((parse(dateKey) - parse(anchorKey)) / 86_400_000);
}

let orderCache: string[] | null = null;

function getMasterOrderIds(): string[] {
  if (!orderCache) {
    orderCache = seededShuffle(
      CHAMPION_PLAYERS.map((p) => p.id),
      hashString(MASTER_SEED),
    );
  }
  return orderCache;
}

/** Un campion distinct pe zi — rotație prin întregul pool fără repetare până la epuizare. */
export function getChampionIdForDate(dateKey: string): string {
  const order = getMasterOrderIds();
  const dayIndex = daysSinceAnchor(dateKey, TRIVIA_ROTATION_ANCHOR);
  const idx = ((dayIndex % order.length) + order.length) % order.length;
  return order[idx];
}

export function getChampionCycleDays(): number {
  return CHAMPION_PLAYERS.length;
}
