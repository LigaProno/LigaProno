import {
  enrichAndValidateNewsItems,
  type WcNewsItem,
} from "@/lib/news-article-meta";
import {
  ALLOWED_NEWS_PUBLISHERS,
  isAllowedNewsArticleUrl,
  isRomanianNewsPublisherUrl,
} from "@/lib/news-publishers";
import { NEWS_FALLBACK_IMAGES } from "@/lib/gemini-wc-news";

export const WC_NEWS_SCRAPER_SOURCE = "rss-scraper";

const TARGET_NEWS_COUNT = 5;
const FETCH_TIMEOUT_MS = 15_000;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; PronoHub/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
  "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.5",
};

/** Feed-uri RSS/Atom verificate — doar domenii din ALLOWED_NEWS_PUBLISHERS. */
const NEWS_FEEDS: Array<{ feedUrl: string; source: string }> = [
  { feedUrl: "https://www.gsp.ro/rss.xml", source: "GSP" },
  { feedUrl: "https://www.sport.ro/rss", source: "Sport.ro" },
  { feedUrl: "https://www.stiripesurse.ro/feed", source: "Știri pe surse" },
  { feedUrl: "https://www.skysports.com/rss/12040", source: "Sky Sports" },
  { feedUrl: "https://www.espn.com/espn/rss/soccer/news", source: "ESPN" },
  { feedUrl: "https://www.espn.co.uk/espn/rss/soccer/news", source: "ESPN" },
];

/** Articole relevante pentru CM 2026 (fotbal), fără false positive pe alte sporturi. */
const WC_TOPIC_RE =
  /\b(cupa mondial[aă]|campionatul mondial|world cup|cm\s*2026|mondial(?:ul)?\s*(?:de\s*fotbal\s*)?2026|world-cup|fifa.*(?:world cup|2026)|(?:world cup|mundial).*(?:2026|fotbal|soccer))\b/i;

const WC_TOPIC_EXCLUDE_RE =
  /\b(canotaj|v[âa]sle|tenis|zverev|roland garros|super rally|piranha|prim[aă]rie|tribunal|mercato var[aă]|r[âa]zboi mondial)\b/i;

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function readTag(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`,
    "i",
  );
  const match = re.exec(block);
  const raw = (match?.[1] ?? match?.[2] ?? "").trim();
  return decodeEntities(stripHtml(raw));
}

function readLink(block: string): string {
  const linkMatch = /<link[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/link>/i.exec(
    block,
  );
  let link = (linkMatch?.[1] ?? linkMatch?.[2] ?? "").trim();
  if (!link) {
    const guidMatch =
      /<guid[^>]*isPermaLink=["']true["'][^>]*>([^<]+)<\/guid>/i.exec(block);
    link = guidMatch?.[1]?.trim() ?? "";
  }
  return link;
}

function readEnclosureImage(block: string): string {
  const match = /<enclosure[^>]+url=["']([^"']+)["']/i.exec(block);
  return match?.[1] ? decodeEntities(match[1]) : "";
}

function readPubDate(block: string): string | undefined {
  const match = /<pubDate[^>]*>([^<]*)<\/pubDate>/i.exec(block);
  const raw = match?.[1]?.trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  publishedAt?: string;
  imageUrl: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    description: string;
    publishedAt?: string;
    imageUrl: string;
  }> = [];
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[1];
    const title = readTag(block, "title");
    const link = readLink(block);
    const description = readTag(block, "description");
    const imageFromDesc =
      /<img[^>]+src=["']([^"']+)["']/i.exec(block)?.[1] ??
      /<img[^>]+src=["']([^"']+)["']/i.exec(description)?.[1] ??
      "";

    items.push({
      title,
      link,
      description,
      publishedAt: readPubDate(block),
      imageUrl: readEnclosureImage(block) || decodeEntities(imageFromDesc),
    });
  }

  return items;
}

function isWorldCupArticle(item: {
  title: string;
  link: string;
  description: string;
}): boolean {
  const haystack = `${item.title} ${item.description} ${item.link}`.toLowerCase();
  if (WC_TOPIC_EXCLUDE_RE.test(haystack)) return false;
  return WC_TOPIC_RE.test(haystack);
}

function publisherLabelForUrl(url: string, fallback: string): string {
  const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  const publisher = ALLOWED_NEWS_PUBLISHERS.find(
    (p) => host === p.host || host.endsWith(`.${p.host}`),
  );
  return publisher?.label ?? fallback;
}

function dedupeByUrl(items: WcNewsItem[]): WcNewsItem[] {
  const seen = new Set<string>();
  const out: WcNewsItem[] = [];
  for (const item of items) {
    const key = item.url.split("?")[0] ?? item.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function rankNews(items: WcNewsItem[]): WcNewsItem[] {
  const ro = items.filter((i) => isRomanianNewsPublisherUrl(i.url));
  const intl = items.filter((i) => !isRomanianNewsPublisherUrl(i.url));
  return dedupeByUrl([...ro, ...intl]);
}

/** Evită 5 articole de pe același site când există alternative. */
function diversifyBySource(items: WcNewsItem[], limit: number): WcNewsItem[] {
  const queues = new Map<string, WcNewsItem[]>();
  for (const item of items) {
    const key = item.source || getNewsSourceKey(item.url);
    const list = queues.get(key) ?? [];
    list.push(item);
    queues.set(key, list);
  }

  const out: WcNewsItem[] = [];
  while (out.length < limit && queues.size > 0) {
    for (const [key, list] of queues) {
      if (out.length >= limit) break;
      const next = list.shift();
      if (next) out.push(next);
      if (list.length === 0) queues.delete(key);
    }
  }
  return dedupeByUrl(out);
}

function getNewsSourceKey(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function selectNewsCandidates(items: WcNewsItem[], limit: number): WcNewsItem[] {
  const ranked = rankNews(items);
  const ro = ranked.filter((i) => isRomanianNewsPublisherUrl(i.url));
  const intl = ranked.filter((i) => !isRomanianNewsPublisherUrl(i.url));
  const roPick = diversifyBySource(ro, limit);
  if (roPick.length >= limit) return roPick.slice(0, limit);
  const intlPick = diversifyBySource(intl, limit - roPick.length);
  return dedupeByUrl([...roPick, ...intlPick]).slice(0, limit);
}

async function fetchFeedXml(feedUrl: string): Promise<string | null> {
  try {
    const res = await fetch(feedUrl, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`wc-news-scraper: feed ${feedUrl} → HTTP ${res.status}`);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("xml") && !res.url.includes(".xml") && !feedUrl.includes("/rss")) {
      console.warn(`wc-news-scraper: feed ${feedUrl} nu e XML (${ct})`);
    }
    return await res.text();
  } catch (e) {
    console.warn(`wc-news-scraper: feed ${feedUrl} eșuat`, e);
    return null;
  }
}

function rssRowToNewsItem(
  row: {
    title: string;
    link: string;
    description: string;
    publishedAt?: string;
    imageUrl: string;
  },
  source: string,
): WcNewsItem | null {
  const title = row.title.trim();
  let url = row.link.trim();
  if (url && !url.startsWith("http")) url = `https://${url}`;
  if (!title || !url.startsWith("https://")) return null;
  if (!isAllowedNewsArticleUrl(url)) return null;
  if (!isWorldCupArticle(row)) return null;

  const summary = row.description.slice(0, 280) || title;
  let imageUrl = row.imageUrl.trim();
  if (imageUrl && !imageUrl.startsWith("http")) imageUrl = "";
  if (imageUrl && !imageUrl.startsWith("https://")) imageUrl = "";

  return {
    title,
    summary,
    url,
    source: publisherLabelForUrl(url, source),
    imageUrl,
    publishedAt: row.publishedAt,
  };
}

async function scrapeNewsFeeds(): Promise<WcNewsItem[]> {
  const batches = await Promise.all(
    NEWS_FEEDS.map(async ({ feedUrl, source }) => {
      const xml = await fetchFeedXml(feedUrl);
      if (!xml) return [] as WcNewsItem[];

      return parseRssItems(xml)
        .map((row) => rssRowToNewsItem(row, source))
        .filter((item): item is WcNewsItem => item != null);
    }),
  );

  return rankNews(batches.flat());
}

/** Știri CM 2026 din RSS + validare URL real (fără Gemini). */
export async function fetchWc2026NewsViaScraper(): Promise<{
  items: WcNewsItem[];
  source: string;
}> {
  const scraped = await scrapeNewsFeeds();

  if (scraped.length === 0) {
    throw new Error(
      "Niciun articol CM 2026 în feed-urile RSS. Verifică conexiunea sau rulează /api/cron/wc-news mai târziu.",
    );
  }

  const toValidate = selectNewsCandidates(scraped, TARGET_NEWS_COUNT + 4);
  const validated = await enrichAndValidateNewsItems(toValidate, NEWS_FALLBACK_IMAGES);
  const items = selectNewsCandidates(validated, TARGET_NEWS_COUNT);

  if (items.length === 0) {
    throw new Error(
      "Articole găsite în RSS, dar niciun URL nu a putut fi verificat (site indisponibil sau blocat).",
    );
  }

  if (items.length < TARGET_NEWS_COUNT) {
    console.warn(
      `fetchWc2026NewsViaScraper: ${items.length}/${TARGET_NEWS_COUNT} după validare.`,
    );
  }

  return { items, source: WC_NEWS_SCRAPER_SOURCE };
}
