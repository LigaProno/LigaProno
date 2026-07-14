import { BINGO_CRITERIA } from "@/data/mini-games/bingo-criteria";

import { TRIVIA_ROTATION_ANCHOR } from "./trivia-selection";

const MASTER_SEED = "pronohub-bingo-master-v1";

const CRITERIA_PER_DAY = 9;



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

      BINGO_CRITERIA.map((c) => c.id),

      hashString(MASTER_SEED),

    );

  }

  return orderCache;

}



/** 9 criterii distincte pe zi — rotație deterministă prin pool-ul complet. */

export function getBingoCriterionIdsForDate(dateKey: string): string[] {

  const order = getMasterOrderIds();

  const dayIndex = daysSinceAnchor(dateKey, TRIVIA_ROTATION_ANCHOR);

  const start = (dayIndex * CRITERIA_PER_DAY) % order.length;

  const result: string[] = [];

  for (let i = 0; i < CRITERIA_PER_DAY; i++) {

    result.push(order[(start + i) % order.length]);

  }

  return result;

}



export function getBingoCycleDays(): number {

  return Math.ceil(BINGO_CRITERIA.length / CRITERIA_PER_DAY);

}


