import type { BettingOddsPayload, MatchOddsRow, Odds1x2Outcome } from "@/lib/betting-odds";
import { isPlausible1x2, isPlausibleCorrectScore } from "@/lib/betting-odds";

const FACT = (() => {
  const a = [1];
  for (let i = 1; i <= 12; i++) a[i] = a[i - 1]! * i;
  return a;
})();

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.exp(-lambda) * Math.pow(lambda, k) / (FACT[k] ?? 1);
}

function outcomeProbs(lh: number, la: number, maxGoals = 10): {
  pH: number;
  pD: number;
  pA: number;
} {
  let pH = 0;
  let pD = 0;
  let pA = 0;
  for (let h = 0; h <= maxGoals; h++) {
    const ph = poissonPmf(h, lh);
    for (let a = 0; a <= maxGoals; a++) {
      const p = ph * poissonPmf(a, la);
      if (h > a) pH += p;
      else if (h === a) pD += p;
      else pA += p;
    }
  }
  const s = pH + pD + pA;
  return s > 0 ? { pH: pH / s, pD: pD / s, pA: pA / s } : { pH: 1 / 3, pD: 1 / 3, pA: 1 / 3 };
}

function impliedFrom1x2(ft: Record<Odds1x2Outcome, number>): {
  pH: number;
  pD: number;
  pA: number;
  overround: number;
} {
  const ih = 1 / Math.max(ft.HOME, 1.01);
  const id = 1 / Math.max(ft.DRAW, 1.01);
  const ia = 1 / Math.max(ft.AWAY, 1.01);
  const overround = ih + id + ia;
  return { pH: ih / overround, pD: id / overround, pA: ia / overround, overround };
}

function fitLambdas(
  target: { pH: number; pD: number; pA: number },
): { lh: number; la: number } {
  let bestLh = 1.35;
  let bestLa = 1.15;
  let bestErr = Infinity;

  const score = (lh: number, la: number) => {
    const o = outcomeProbs(lh, la);
    return (
      (o.pH - target.pH) ** 2 +
      (o.pD - target.pD) ** 2 +
      (o.pA - target.pA) ** 2
    );
  };

  for (let lh = 0.35; lh <= 3.9; lh += 0.05) {
    for (let la = 0.25; la <= 3.6; la += 0.05) {
      const err = score(lh, la);
      if (err < bestErr) {
        bestErr = err;
        bestLh = lh;
        bestLa = la;
      }
    }
  }

  for (let lh = bestLh - 0.04; lh <= bestLh + 0.04; lh += 0.01) {
    if (lh < 0.2) continue;
    for (let la = bestLa - 0.04; la <= bestLa + 0.04; la += 0.01) {
      if (la < 0.15) continue;
      const err = score(lh, la);
      if (err < bestErr) {
        bestErr = err;
        bestLh = lh;
        bestLa = la;
      }
    }
  }

  return { lh: bestLh, la: bestLa };
}

function clampMarketOdd(n: number, min = 1.25, max = 80): number {
  if (!Number.isFinite(n)) return max;
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100));
}

function oddsFromProb(p: number, overround: number, min = 1.25, max = 80): number {
  if (p <= 0.0008) return max;
  return clampMarketOdd(overround / p, min, max);
}

const HTFT_KEYS: Array<{ key: string; ht: Odds1x2Outcome; ft: Odds1x2Outcome }> = [
  { key: "HOME/HOME", ht: "HOME", ft: "HOME" },
  { key: "HOME/DRAW", ht: "HOME", ft: "DRAW" },
  { key: "HOME/AWAY", ht: "HOME", ft: "AWAY" },
  { key: "DRAW/HOME", ht: "DRAW", ft: "HOME" },
  { key: "DRAW/DRAW", ht: "DRAW", ft: "DRAW" },
  { key: "DRAW/AWAY", ht: "DRAW", ft: "AWAY" },
  { key: "AWAY/HOME", ht: "AWAY", ft: "HOME" },
  { key: "AWAY/DRAW", ht: "AWAY", ft: "DRAW" },
  { key: "AWAY/AWAY", ht: "AWAY", ft: "AWAY" },
];

/**
 * Completează HT 1X2, HT/FT și scorul corect din 1X2-ul de 90 min.
 * Folosit când OddsPortal nu mai expune feed-urile de piețe (fără xhashf).
 * Nu produce niciodată cote-placeholder 1.01.
 */
export function estimateDerivedMarketsFromFt1x2(
  ft: Record<Odds1x2Outcome, number>,
): Pick<MatchOddsRow, "ht1x2" | "htFt" | "correctScore"> | null {
  if (!isPlausible1x2(ft)) return null;

  const implied = impliedFrom1x2(ft);
  const { lh, la } = fitLambdas(implied);
  const csOverround = Math.max(1.18, implied.overround * 1.06);
  const htOverround = Math.max(1.08, implied.overround);

  const correctScore: Record<string, number> = {};
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const p = poissonPmf(h, lh) * poissonPmf(a, la);
      correctScore[`${h}-${a}`] = oddsFromProb(p, csOverround, 1.4, 80);
    }
  }
  if (!isPlausibleCorrectScore(correctScore)) return null;

  // Prima repriză ~45% din goluri (a doua e în general mai prolifică).
  const htLh = lh * 0.45;
  const htLa = la * 0.45;
  const htP = outcomeProbs(htLh, htLa);
  const ht1x2: Record<Odds1x2Outcome, number> = {
    HOME: oddsFromProb(htP.pH, htOverround, 1.35, 25),
    DRAW: oddsFromProb(htP.pD, htOverround, 1.35, 25),
    AWAY: oddsFromProb(htP.pA, htOverround, 1.35, 25),
  };

  const secondLh = Math.max(0.15, lh - htLh);
  const secondLa = Math.max(0.12, la - htLa);
  const htFt: Record<string, number> = {};
  const htFtOverround = Math.max(1.2, implied.overround * 1.1);

  function halfOutcome(
    homeGoals: number,
    awayGoals: number,
  ): Odds1x2Outcome {
    if (homeGoals > awayGoals) return "HOME";
    if (homeGoals < awayGoals) return "AWAY";
    return "DRAW";
  }

  const comboP: Record<string, number> = {};
  for (const k of HTFT_KEYS) comboP[k.key] = 0;
  const maxH = 6;
  for (let h1 = 0; h1 <= maxH; h1++) {
    for (let a1 = 0; a1 <= maxH; a1++) {
      const p1 = poissonPmf(h1, htLh) * poissonPmf(a1, htLa);
      const htOut = halfOutcome(h1, a1);
      for (let h2 = 0; h2 <= maxH; h2++) {
        for (let a2 = 0; a2 <= maxH; a2++) {
          const p2 = poissonPmf(h2, secondLh) * poissonPmf(a2, secondLa);
          const ftOut = halfOutcome(h1 + h2, a1 + a2);
          const key = `${htOut}/${ftOut}`;
          comboP[key] = (comboP[key] ?? 0) + p1 * p2;
        }
      }
    }
  }
  for (const { key } of HTFT_KEYS) {
    htFt[key] = oddsFromProb(comboP[key] ?? 0, htFtOverround, 1.6, 80);
  }

  return { ht1x2, htFt, correctScore };
}

export function fillEstimatedMatchMarkets(row: MatchOddsRow): MatchOddsRow {
  const derived = estimateDerivedMarketsFromFt1x2(row.ft1x2);
  if (!derived) return row;

  const needHt = !isPlausible1x2(row.ht1x2);
  const needCs = !isPlausibleCorrectScore(row.correctScore);
  const needHtFt = !row.htFt || Object.keys(row.htFt).length < 6;

  if (!needHt && !needCs && !needHtFt) return row;

  return {
    ...row,
    ht1x2: needHt ? derived.ht1x2 : row.ht1x2,
    correctScore: needCs ? derived.correctScore : row.correctScore,
    htFt: needHtFt ? derived.htFt : row.htFt,
  };
}

export function fillEstimatedMatchMarketsInPayload(
  payload: BettingOddsPayload,
): BettingOddsPayload {
  const matches: Record<string, MatchOddsRow> = {};
  for (const [id, row] of Object.entries(payload.matches)) {
    matches[id] = fillEstimatedMatchMarkets(row);
  }
  return { ...payload, matches };
}
