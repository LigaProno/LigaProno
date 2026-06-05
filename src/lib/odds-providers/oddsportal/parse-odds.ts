import type { MatchOddsRow, Odds1x2Outcome } from "@/lib/betting-odds";

type OddsBackEntry = {
  odds?: Record<string, Record<string, unknown>>;
};

type OddsFeedRoot = {
  d?: {
    oddsdata?: {
      back?: Record<string, OddsBackEntry>;
    };
  };
};

function median(nums: number[]): number | null {
  const arr = nums.filter((n) => Number.isFinite(n) && n >= 1).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid]! : (arr[mid - 1]! + arr[mid]!) / 2;
}

function collectOutcomeOdds(
  back: Record<string, OddsBackEntry>,
  prefix: string,
  outcomeIndex: "0" | "1" | "2",
): number[] {
  const vals: number[] = [];
  for (const [marketKey, entry] of Object.entries(back)) {
    if (!marketKey.startsWith(prefix)) continue;
    const oddsMap = entry?.odds ?? {};
    for (const bookOdds of Object.values(oddsMap)) {
      const raw = bookOdds?.[outcomeIndex];
      if (typeof raw === "number" && Number.isFinite(raw)) vals.push(raw);
      else if (typeof raw === "string") {
        const n = Number(raw);
        if (Number.isFinite(n)) vals.push(n);
      }
    }
  }
  return vals;
}

export function parse1x2FromFeed(
  data: unknown,
  scope: 2 | 3,
): Record<Odds1x2Outcome, number> | null {
  const back = (data as OddsFeedRoot)?.d?.oddsdata?.back ?? {};
  const prefix = `E-1-${scope}-0-0`;
  const h = median(collectOutcomeOdds(back, prefix, "0"));
  const d = median(collectOutcomeOdds(back, prefix, "1"));
  const a = median(collectOutcomeOdds(back, prefix, "2"));
  if (h == null || d == null || a == null) return null;
  return { HOME: h, DRAW: d, AWAY: a };
}

export function parseCorrectScoreFromFeed(data: unknown): Record<string, number> {
  const back = (data as OddsFeedRoot)?.d?.oddsdata?.back ?? {};
  const out: Record<string, number> = {};

  for (const [marketKey, entry] of Object.entries(back)) {
    if (!marketKey.startsWith("E-8-2-0-0-")) continue;
    const suffix = marketKey.split("-").pop() ?? "";
    if (suffix.length !== 2 || !/^\d\d$/.test(suffix)) continue;
    const home = Number(suffix[0]);
    const away = Number(suffix[1]);
    if (home > 4 || away > 4) continue;

    const oddsMap = entry?.odds ?? {};
    const vals: number[] = [];
    for (const bookOdds of Object.values(oddsMap)) {
      const raw = bookOdds?.["0"];
      if (typeof raw === "number" && Number.isFinite(raw)) vals.push(raw);
      else if (typeof raw === "string") {
        const n = Number(raw);
        if (Number.isFinite(n)) vals.push(n);
      }
    }
    const m = median(vals);
    if (m != null) out[`${home}-${away}`] = m;
  }

  return out;
}

export type OutrightRow = { teamName: string; odd: number };

type OutrightBackEntry = {
  mixedParameterName?: string;
  odds?: Record<string, number[] | number | string>;
};

export function parseOutrightWinnerFromFeed(data: unknown): OutrightRow[] {
  const back =
    (data as { d?: { oddsdata?: { back?: Record<string, OutrightBackEntry> } } })
      ?.d?.oddsdata?.back ?? {};

  const byName = new Map<string, number[]>();

  for (const entry of Object.values(back)) {
    const teamName = entry?.mixedParameterName?.trim();
    if (!teamName) continue;

    const oddsMap = entry.odds ?? {};
    const vals: number[] = [];
    for (const raw of Object.values(oddsMap)) {
      if (Array.isArray(raw)) {
        const n = Number(raw[0]);
        if (Number.isFinite(n) && n >= 1) vals.push(n);
      } else if (typeof raw === "number" && raw >= 1) {
        vals.push(raw);
      } else if (typeof raw === "string") {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= 1) vals.push(n);
      }
    }

    const key = teamName.toLowerCase();
    const prev = byName.get(key) ?? [];
    byName.set(key, prev.concat(vals));
  }

  const aggregated: OutrightRow[] = [];
  for (const [key, odds] of byName) {
    const m = median(odds);
    if (m != null) aggregated.push({ teamName: key, odd: m });
  }
  return aggregated;
}

export function mergeMatchOddsRows(
  ft: Record<Odds1x2Outcome, number> | null,
  ht: Record<Odds1x2Outcome, number> | null,
  correctScore: Record<string, number>,
): MatchOddsRow {
  const fallback1x2 = { HOME: 1, DRAW: 1, AWAY: 1 } as Record<Odds1x2Outcome, number>;
  return {
    ft1x2: ft ?? fallback1x2,
    ht1x2: ht ?? fallback1x2,
    correctScore,
  };
}
