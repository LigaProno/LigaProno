import {
  DEFAULT_USER_AGENT,
  fetchAndDecryptJson,
  ODDSPORTAL_BASE,
} from "@/lib/odds-providers/oddsportal/decrypt";
import {
  buildMatchEventPath,
  buildOutrightPath,
  OP_MARKET_CORRECT_SCORE,
  OP_MARKET_FT_1X2,
  OP_MARKET_HT_1X2,
  OP_MARKET_OUTRIGHT_WINNER,
} from "@/lib/odds-providers/oddsportal/markets";
import type { OddsPortalCompetitionConfig } from "@/lib/odds-providers/oddsportal/competition-map";
import { buildShortMatchPageUrl } from "@/lib/odds-providers/oddsportal/competition-map";
import { delay } from "@/lib/odds-providers/concurrency";

export type OpEventMeta = {
  matchId: string;
  home: string;
  away: string;
  startDateUnix: number | null;
  xhashf: string;
  sportId: number;
  versionId: number;
};

function getRequestDelayMs(): number {
  const raw = process.env.ODDSPORTAL_REQUEST_DELAY_MS?.trim();
  const n = raw ? Number(raw) : 250;
  return Number.isFinite(n) && n >= 0 ? n : 250;
}

export async function fetchOddsPortalHtml(url: string, referer?: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.ODDSPORTAL_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      Referer: referer ?? ODDSPORTAL_BASE,
    },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    throw new Error(`OddsPortal HTML ${res.status} pentru ${url}`);
  }
  return res.text();
}

export type OpScheduleFixture = {
  matchId: string;
  home: string;
  away: string;
  startDateIso: string | null;
  stadium: string | null;
  city: string | null;
  country: string | null;
};

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function parseTournamentFixturesFromHtml(html: string): OpScheduleFixture[] {
  const fixtures: OpScheduleFixture[] = [];
  const seen = new Set<string>();

  const ldJsonBlocks = html.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi,
  );
  if (!ldJsonBlocks) return fixtures;

  for (const block of ldJsonBlocks) {
    const inner = block.replace(/<\/?script[^>]*>/gi, "").trim();
    try {
      const obj = JSON.parse(inner) as {
        name?: string;
        startDate?: string;
        url?: string;
        location?: {
          name?: string;
          address?: {
            addressLocality?: string;
            addressCountry?: string;
          };
        };
      };
      const url = obj.url ?? "";
      const hashMatch = url.match(/#([A-Za-z0-9]+)\/?$/);
      const matchId = hashMatch?.[1];
      if (!matchId || seen.has(matchId)) continue;

      const name = decodeHtmlEntities(obj.name?.trim() ?? "");
      if (!name || !name.includes(" - ")) continue;

      const [home, away] = name.split(" - ").map((s) => decodeHtmlEntities(s.trim()));
      if (!home || !away) continue;

      const stadium = decodeHtmlEntities(obj.location?.name?.trim() ?? "") || null;
      const city =
        decodeHtmlEntities(obj.location?.address?.addressLocality?.trim() ?? "") ||
        null;
      const country =
        decodeHtmlEntities(obj.location?.address?.addressCountry?.trim() ?? "") ||
        null;

      seen.add(matchId);
      fixtures.push({
        matchId,
        home,
        away,
        startDateIso: obj.startDate ?? null,
        stadium,
        city,
        country,
      });
    } catch {
      continue;
    }
  }

  return fixtures;
}

/** Extrage metadate meci (xhashf) din pagina evenimentului. */
export function parseEventMetaFromHtml(html: string): OpEventMeta | null {
  const dataMatch = html.match(/id="react-event-header"\s+data='(\{[\s\S]*?\})'/);
  if (!dataMatch?.[1]) {
    const alt = html.match(/id="react-event-header"[\s\S]*?data='(\{[\s\S]*?\})'/);
    if (!alt?.[1]) return null;
    return parseEventDataJson(alt[1]);
  }
  return parseEventDataJson(dataMatch[1]);
}

function parseEventDataJson(raw: string): OpEventMeta | null {
  try {
    const parsed = JSON.parse(raw) as {
      eventData?: {
        id?: string;
        xhashf?: string;
        home?: string;
        away?: string;
        sportId?: number;
        versionId?: number;
      };
      eventBody?: { startDate?: number };
    };
    const ed = parsed.eventData;
    if (!ed?.id || !ed.xhashf) return null;
    return {
      matchId: ed.id,
      home: ed.home ?? "",
      away: ed.away ?? "",
      startDateUnix: parsed.eventBody?.startDate ?? null,
      xhashf: ed.xhashf,
      sportId: ed.sportId ?? 1,
      versionId: ed.versionId ?? 1,
    };
  } catch {
    return null;
  }
}

export function parseOutrightRequestFromHtml(html: string): string | null {
  const m = html.match(/pageOutrightsVar\s*=\s*'(\{[\s\S]*?\})'/);
  if (!m?.[1]) return null;
  try {
    const o = JSON.parse(m[1]) as { request?: { url?: string } };
    return o.request?.url ?? null;
  } catch {
    return null;
  }
}

export async function fetchEventMeta(
  config: OddsPortalCompetitionConfig,
  matchId: string,
): Promise<OpEventMeta | null> {
  const url = buildShortMatchPageUrl(config, matchId);
  const html = await fetchOddsPortalHtml(url, config.tournamentPageUrl);
  return parseEventMetaFromHtml(html);
}

export async function fetchMatchMarketFeed(
  meta: OpEventMeta,
  betType: number,
  scope: number,
  referer: string,
): Promise<unknown> {
  const path = buildMatchEventPath(
    meta.matchId,
    betType,
    scope,
    meta.xhashf,
    meta.versionId,
    meta.sportId,
  );
  const url = `${ODDSPORTAL_BASE}${path}?_=${Date.now()}`;
  await delay(getRequestDelayMs());
  return fetchAndDecryptJson(url, referer);
}

export async function fetchFtHtCsFeeds(
  meta: OpEventMeta,
  referer: string,
): Promise<{ ft: unknown; ht: unknown; cs: unknown }> {
  const [ft, ht, cs] = await Promise.all([
    fetchMatchMarketFeed(meta, OP_MARKET_FT_1X2.betType, OP_MARKET_FT_1X2.scope, referer),
    fetchMatchMarketFeed(meta, OP_MARKET_HT_1X2.betType, OP_MARKET_HT_1X2.scope, referer),
    fetchMatchMarketFeed(
      meta,
      OP_MARKET_CORRECT_SCORE.betType,
      OP_MARKET_CORRECT_SCORE.scope,
      referer,
    ),
  ]);
  return { ft, ht, cs };
}

export async function fetchOutrightWinnerFeed(
  config: OddsPortalCompetitionConfig,
): Promise<unknown> {
  const html = await fetchOddsPortalHtml(config.outrightsPageUrl, config.tournamentPageUrl);
  const customPath = parseOutrightRequestFromHtml(html);
  const path =
    customPath?.split("?_=")[0] ??
    buildOutrightPath(config.tournamentNumericId, OP_MARKET_OUTRIGHT_WINNER.betType);
  const url = `${ODDSPORTAL_BASE}${path}?_=${Date.now()}`;
  await delay(getRequestDelayMs());
  return fetchAndDecryptJson(url, config.outrightsPageUrl);
}

export async function fetchTournamentFixtures(
  config: OddsPortalCompetitionConfig,
): Promise<OpScheduleFixture[]> {
  const html = await fetchOddsPortalHtml(config.tournamentPageUrl);
  return parseTournamentFixturesFromHtml(html);
}
