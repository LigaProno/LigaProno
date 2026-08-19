import type { Odds1x2Outcome } from "@/lib/betting-odds";
import type { OpScheduleFixture } from "@/lib/odds-providers/oddsportal/client";

export type ListingFt1x2 = Record<Odds1x2Outcome, number>;

export type ListingMatchOdds = {
  matchId: string;
  home: string;
  away: string;
  eventPageUrl: string | null;
  ft1x2: ListingFt1x2 | null;
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

function unescapeJsString(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"');
}

function parseDecimalOdd(raw: string): number | null {
  const n = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 1.04) return null;
  return n;
}

/**
 * Cote 1X2 din tabelul Next.js OddsPortal (`data-testid="game-row"` +
 * `odd-container-default`). Nu depinde de xhashf / pagina de meci.
 */
export function parseListingFt1x2FromHtml(html: string): ListingMatchOdds[] {
  const out: ListingMatchOdds[] = [];
  const seen = new Set<string>();
  const rowChunks = html.split(/data-testid="game-row"/i);
  for (const chunk of rowChunks.slice(1)) {
    const hrefMatch = chunk.match(
      /href="([^"]+#([A-Za-z0-9]{4,}))"/i,
    );
    const matchId = hrefMatch?.[2];
    if (!matchId || seen.has(matchId)) continue;

    const host =
      chunk.match(
        /data-testid="game-host"[\s\S]*?data-testid="participant-name">([^<]+)/i,
      )?.[1] ??
      chunk.match(/data-testid="participant-name">([^<]+)/i)?.[1];
    const guest = chunk.match(
      /data-testid="game-guest"[\s\S]*?data-testid="participant-name">([^<]+)/i,
    )?.[1];
    if (!host?.trim() || !guest?.trim()) continue;

    const oddRaw = [...chunk.matchAll(
      /data-testid="odd-container-default">([^<]+)/gi,
    )].map((m) => m[1] ?? "");
    const home = parseDecimalOdd(oddRaw[0] ?? "");
    const draw = parseDecimalOdd(oddRaw[1] ?? "");
    const away = parseDecimalOdd(oddRaw[2] ?? "");
    const ft1x2 =
      home != null && draw != null && away != null ?
        { HOME: home, DRAW: draw, AWAY: away }
      : null;

    const rel = hrefMatch?.[1]?.replace(/&amp;/g, "&") ?? null;
    const eventPageUrl =
      rel ?
        rel.startsWith("http") ?
          rel
        : `https://www.oddsportal.com${rel.startsWith("/") ? rel : `/${rel}`}`
      : null;

    seen.add(matchId);
    out.push({
      matchId,
      home: decodeHtmlEntities(host.trim()),
      away: decodeHtmlEntities(guest.trim()),
      eventPageUrl,
      ft1x2,
    });
  }
  return out;
}

/**
 * Fixture-uri din JSON-ul escapat al paginii Next.js.
 * Ordinea actuală: home-name, away-name, … encodeEventId, … url, … timestamp.
 */
export function parseNextEventFixturesFromHtml(html: string): OpScheduleFixture[] {
  const decoded = unescapeJsString(html);
  const fixtures: OpScheduleFixture[] = [];
  const seen = new Set<string>();

  const re =
    /"home-name"\s*:\s*"([^"]+)"\s*,\s*"away-name"\s*:\s*"([^"]+)"[\s\S]{0,1800}?"encodeEventId"\s*:\s*"([A-Za-z0-9]+)"[\s\S]{0,1800}?"url"\s*:\s*"([^"]+)"[\s\S]{0,900}?"date-start-timestamp"\s*:\s*(\d+)/g;

  for (const m of decoded.matchAll(re)) {
    const home = decodeHtmlEntities(m[1]!.trim());
    const away = decodeHtmlEntities(m[2]!.trim());
    const matchId = m[3]!;
    if (seen.has(matchId) || !home || !away) continue;
    seen.add(matchId);
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

  return fixtures;
}

export function mergeListingOddsOntoFixtures(
  fixtures: OpScheduleFixture[],
  listing: ListingMatchOdds[],
): OpScheduleFixture[] {
  const byId = new Map(listing.map((r) => [r.matchId, r]));
  return fixtures.map((fx) => {
    const row = byId.get(fx.matchId);
    if (!row?.ft1x2) return fx;
    return { ...fx, ft1x2: row.ft1x2 };
  });
}
