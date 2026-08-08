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
  OP_MARKET_HT_FT,
  OP_MARKET_OUTRIGHT_WINNER,
} from "@/lib/odds-providers/oddsportal/markets";
import type { OddsPortalCompetitionConfig } from "@/lib/odds-providers/oddsportal/competition-map";
import {
  buildShortMatchPageUrl,
  buildTournamentResultsUrl,
} from "@/lib/odds-providers/oddsportal/competition-map";
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

/** Scor final extras din `react-event-header` (meciuri terminate pe OddsPortal). */
export type OpEventResult = {
  matchId: string;
  home: string;
  away: string;
  isFinished: boolean;
  ftHome: number;
  ftAway: number;
  htHome: number;
  htAway: number;
};

function getRequestDelayMs(): number {
  const raw = process.env.ODDSPORTAL_REQUEST_DELAY_MS?.trim();
  const n = raw ? Number(raw) : 250;
  return Number.isFinite(n) && n >= 0 ? n : 250;
}

export async function fetchOddsPortalHtml(
  url: string,
  referer?: string,
  options?: { fresh?: boolean },
): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.ODDSPORTAL_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      Referer: referer ?? ODDSPORTAL_BASE,
    },
    ...(options?.fresh ?
      { cache: "no-store" as const }
    : { next: { revalidate: 86400 } }),
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
  /** URL H2H OddsPortal (ex. /football/h2h/.../#id) — util pentru meciuri terminate. */
  eventPageUrl?: string | null;
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
  if (ldJsonBlocks) {
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
          eventPageUrl: url || null,
        });
      } catch {
        continue;
      }
    }
  }

  // Fallback / complement: evenimente din JSON HTML-encodat (results page / liste React).
  for (const fx of parseEncodedScheduleFixturesFromHtml(html)) {
    if (seen.has(fx.matchId)) continue;
    seen.add(fx.matchId);
    fixtures.push(fx);
  }

  return fixtures;
}

/**
 * Extrage fixture-uri din atribute `data` HTML-encodate (`&quot;encodeEventId&quot;:...`).
 * Necesar pe pagina de results, unde LD+JSON poate lipsi pentru meciuri terminate.
 */
export function parseEncodedScheduleFixturesFromHtml(html: string): OpScheduleFixture[] {
  const decoded = decodeHtmlEntities(html);
  const fixtures: OpScheduleFixture[] = [];
  const seen = new Set<string>();

  const re =
    /"encodeEventId"\s*:\s*"([A-Za-z0-9]+)"[\s\S]{0,500}?"home-name"\s*:\s*"([^"]+)"[\s\S]{0,120}?"away-name"\s*:\s*"([^"]+)"[\s\S]{0,800}?"url"\s*:\s*"([^"]+)"[\s\S]{0,400}?"date-start-timestamp"\s*:\s*(\d+)/g;

  for (const m of decoded.matchAll(re)) {
    const matchId = m[1]!;
    if (seen.has(matchId)) continue;
    seen.add(matchId);
    const home = m[2]!.trim();
    const away = m[3]!.trim();
    const rawUrl = m[4]!.replace(/\\+/g, "");
    const ts = Number(m[5]);
    fixtures.push({
      matchId,
      home,
      away,
      startDateIso: Number.isFinite(ts) ? new Date(ts * 1000).toISOString() : null,
      stadium: null,
      city: null,
      country: null,
      eventPageUrl: rawUrl.startsWith("http")
        ? rawUrl
        : `https://www.oddsportal.com${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`,
    });
  }

  // Variantă cu ordinea câmpurilor diferită (url înainte de names).
  const reAlt =
    /"encodeEventId"\s*:\s*"([A-Za-z0-9]+)"[\s\S]{0,200}?"url"\s*:\s*"([^"]+)"[\s\S]{0,400}?"home-name"\s*:\s*"([^"]+)"[\s\S]{0,120}?"away-name"\s*:\s*"([^"]+)"[\s\S]{0,400}?"date-start-timestamp"\s*:\s*(\d+)/g;
  for (const m of decoded.matchAll(reAlt)) {
    const matchId = m[1]!;
    if (seen.has(matchId)) continue;
    seen.add(matchId);
    const rawUrl = m[2]!.replace(/\\+/g, "");
    const home = m[3]!.trim();
    const away = m[4]!.trim();
    const ts = Number(m[5]);
    fixtures.push({
      matchId,
      home,
      away,
      startDateIso: Number.isFinite(ts) ? new Date(ts * 1000).toISOString() : null,
      stadium: null,
      city: null,
      country: null,
      eventPageUrl: rawUrl.startsWith("http")
        ? rawUrl
        : `https://www.oddsportal.com${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`,
    });
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

function parseNonNegInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return null;
}

/** Scor HT/FT din același payload `react-event-header` — doar meciuri finished cu scor complet. */
export function parseEventResultFromHtml(html: string): OpEventResult | null {
  const dataMatch =
    html.match(/id="react-event-header"\s+data='(\{[\s\S]*?\})'/) ??
    html.match(/id="react-event-header"[\s\S]*?data='(\{[\s\S]*?\})'/);
  if (!dataMatch?.[1]) return null;

  try {
    const parsed = JSON.parse(dataMatch[1]) as {
      eventData?: {
        id?: string;
        home?: string;
        away?: string;
        isFinished?: boolean;
      };
      eventBody?: {
        homeResult?: unknown;
        awayResult?: unknown;
        homeResultPartial_0?: unknown;
        awayResultPartial_0?: unknown;
        eventStageId?: number;
        eventStageName?: string;
      };
    };
    const ed = parsed.eventData;
    const body = parsed.eventBody;
    if (!ed?.id || !body) return null;

    const finished =
      ed.isFinished === true ||
      body.eventStageId === 3 ||
      /finished/i.test(body.eventStageName ?? "");
    if (!finished) return null;

    const ftHome = parseNonNegInt(body.homeResult);
    const ftAway = parseNonNegInt(body.awayResult);
    const htHome = parseNonNegInt(body.homeResultPartial_0);
    const htAway = parseNonNegInt(body.awayResultPartial_0);
    if (ftHome == null || ftAway == null || htHome == null || htAway == null) {
      return null;
    }

    return {
      matchId: ed.id,
      home: ed.home ?? "",
      away: ed.away ?? "",
      isFinished: true,
      ftHome,
      ftAway,
      htHome,
      htAway,
    };
  } catch {
    return null;
  }
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
  options?: { eventPageUrl?: string | null },
): Promise<OpEventMeta | null> {
  const eventPageUrl = options?.eventPageUrl?.trim();
  if (eventPageUrl) {
    const withEventId = appendEventIdQuery(eventPageUrl, matchId);
    const html = await fetchOddsPortalHtml(withEventId, config.tournamentPageUrl, {
      fresh: true,
    });
    const meta = parseEventMetaFromHtml(html);
    if (meta && meta.matchId === matchId) return meta;
  }

  const url = buildShortMatchPageUrl(config, matchId);
  const html = await fetchOddsPortalHtml(url, config.tournamentPageUrl, {
    fresh: true,
  });
  const meta = parseEventMetaFromHtml(html);
  if (meta && meta.matchId === matchId) return meta;
  // Short URL pe meciuri terminate poate redirecționa la următorul H2H.
  return meta?.matchId === matchId ? meta : null;
}

function appendEventIdQuery(url: string, eventId: string): string {
  try {
    const u = new URL(url, ODDSPORTAL_BASE);
    u.searchParams.set("eventId", eventId);
    // Elimină hash-ul — OddsPortal încarcă evenimentul din query pe H2H.
    u.hash = "";
    return u.toString();
  } catch {
    const base = url.split("#")[0] ?? url;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}eventId=${encodeURIComponent(eventId)}`;
  }
}

/** Scor final (fresh, fără cache Next) — pentru fallback când Football-Data întârzie. */
export async function fetchEventResult(
  config: OddsPortalCompetitionConfig,
  matchId: string,
): Promise<OpEventResult | null> {
  const url = buildShortMatchPageUrl(config, matchId);
  const html = await fetchOddsPortalHtml(url, config.tournamentPageUrl, {
    fresh: true,
  });
  return parseEventResultFromHtml(html);
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
): Promise<{ ft: unknown; ht: unknown; cs: unknown; htFt: unknown }> {
  const [ft, ht, cs, htFt] = await Promise.all([
    fetchMatchMarketFeed(meta, OP_MARKET_FT_1X2.betType, OP_MARKET_FT_1X2.scope, referer),
    fetchMatchMarketFeed(meta, OP_MARKET_HT_1X2.betType, OP_MARKET_HT_1X2.scope, referer),
    fetchMatchMarketFeed(
      meta,
      OP_MARKET_CORRECT_SCORE.betType,
      OP_MARKET_CORRECT_SCORE.scope,
      referer,
    ),
    fetchMatchMarketFeed(meta, OP_MARKET_HT_FT.betType, OP_MARKET_HT_FT.scope, referer),
  ]);
  return { ft, ht, cs, htFt };
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

/** Fixture-uri de pe pagina de rezultate (meciuri terminate, pot lipsi de pe overview). */
export async function fetchTournamentResultFixtures(
  config: OddsPortalCompetitionConfig,
): Promise<OpScheduleFixture[]> {
  const html = await fetchOddsPortalHtml(
    buildTournamentResultsUrl(config),
    config.tournamentPageUrl,
    { fresh: true },
  );
  return parseTournamentFixturesFromHtml(html);
}

/** Overview + results, deduplicate pe matchId OddsPortal. */
export async function fetchTournamentFixturesForScoreFallback(
  config: OddsPortalCompetitionConfig,
): Promise<OpScheduleFixture[]> {
  const [upcoming, results] = await Promise.all([
    fetchTournamentFixtures(config).catch(() => [] as OpScheduleFixture[]),
    fetchTournamentResultFixtures(config).catch(() => [] as OpScheduleFixture[]),
  ]);
  return mergeScheduleFixtures(results, upcoming);
}

/**
 * Unește liste de fixture-uri; preferă intrarea cu stadion / oră mai completă.
 */
export function mergeScheduleFixtures(
  ...lists: OpScheduleFixture[][]
): OpScheduleFixture[] {
  const byId = new Map<string, OpScheduleFixture>();

  function richness(fx: OpScheduleFixture): number {
    let n = 0;
    if (fx.stadium?.trim()) n += 4;
    if (fx.city?.trim()) n += 1;
    if (fx.startDateIso) n += 2;
    return n;
  }

  for (const list of lists) {
    for (const fx of list) {
      const prev = byId.get(fx.matchId);
      if (!prev || richness(fx) > richness(prev)) {
        byId.set(fx.matchId, prev ? { ...prev, ...fx, stadium: fx.stadium ?? prev.stadium, city: fx.city ?? prev.city, country: fx.country ?? prev.country, startDateIso: fx.startDateIso ?? prev.startDateIso } : fx);
      } else if (prev) {
        byId.set(fx.matchId, {
          ...fx,
          ...prev,
          stadium: prev.stadium ?? fx.stadium,
          city: prev.city ?? fx.city,
          country: prev.country ?? fx.country,
          startDateIso: prev.startDateIso ?? fx.startDateIso,
        });
      }
    }
  }

  return [...byId.values()];
}
