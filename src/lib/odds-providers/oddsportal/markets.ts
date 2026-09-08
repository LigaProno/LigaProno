/** Piețe OddsPortal: betType-scope (ex. 1-2 = FT 1X2, 1-3 = HT 1X2, 9-2 = HT/FT dublu, 8-2 = correct score). */
export const OP_MARKET_FT_1X2 = { betType: 1, scope: 2 } as const;
export const OP_MARKET_HT_1X2 = { betType: 1, scope: 3 } as const;
export const OP_MARKET_HT_FT = { betType: 9, scope: 2 } as const;
export const OP_MARKET_CORRECT_SCORE = { betType: 8, scope: 2 } as const;
export const OP_MARKET_OUTRIGHT_WINNER = { betType: 11 } as const;

export type OpMatchMarket =
  | typeof OP_MARKET_FT_1X2
  | typeof OP_MARKET_HT_1X2
  | typeof OP_MARKET_HT_FT
  | typeof OP_MARKET_CORRECT_SCORE;

/**
 * Feed-urile de piețe nu mai sunt servite de pe pagina publică, ci prin proxy-ul
 * către `backend.oddsportal.com` (accesul direct la backend răspunde cu 403).
 */
export const OP_BACKEND_PROXY_PREFIX = "/proxy";

/**
 * Hash implicit folosit de aplicația OddsPortal când pagina nu îi furnizează
 * unul propriu. Ne scutește de `xhashf`, care nu mai apare în HTML-ul SSR.
 */
export const OP_DEFAULT_MATCH_XHASH = "yj0e1";

export function buildMatchEventPath(
  matchId: string,
  betType: number,
  scope: number,
  xhash: string = OP_DEFAULT_MATCH_XHASH,
  versionId = 1,
  sportId = 1,
): string {
  const hash = decodeURIComponent(xhash.replace(/^\//, "")) || OP_DEFAULT_MATCH_XHASH;
  return (
    `${OP_BACKEND_PROXY_PREFIX}/match-event/` +
    `${versionId}-${sportId}-${matchId}-${betType}-${scope}-${hash}.dat` +
    `?geo=en&lang=en`
  );
}

export function buildOutrightPath(
  tournamentNumericId: number,
  betType: number,
  sportId = 1,
): string {
  return `/feed/outrights/${sportId}-${tournamentNumericId}-${betType}.dat`;
}

export function decodeXhash(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}
