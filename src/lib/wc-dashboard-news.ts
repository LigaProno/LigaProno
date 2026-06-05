import { prisma } from "@/lib/prisma";
import { isAllowedNewsArticleUrl, type WcNewsItem } from "@/lib/gemini-wc-news";
import { fetchWc2026NewsViaScraper, WC_NEWS_SCRAPER_SOURCE } from "@/lib/wc-news-scraper";

export type { WcNewsItem };

const TARGET_COUNT = 5;

/** Pe dashboard nu blocăm încărcarea cu refresh RSS — doar cron / lipsă totală cache. */
const REFRESH_ON_DASHBOARD_LOAD =
  (process.env.WC_NEWS_REFRESH_ON_LOAD ?? "false").trim().toLowerCase() === "true";

export function todayDateKeyUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseItems(raw: unknown): WcNewsItem[] {
  if (!Array.isArray(raw)) return [];
  const out: WcNewsItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const summary = typeof o.summary === "string" ? o.summary.trim() : "";
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const source = typeof o.source === "string" ? o.source.trim() : "";
    let imageUrl = typeof o.imageUrl === "string" ? o.imageUrl.trim() : "";
    if (imageUrl && !imageUrl.startsWith("http")) imageUrl = `https://${imageUrl}`;
    if (imageUrl && !imageUrl.startsWith("https://")) imageUrl = "";
    if (!title || !url.startsWith("http")) continue;
    if (!isAllowedNewsArticleUrl(url)) continue;
    out.push({
      title,
      summary: summary || title,
      url,
      source: source || "Sport",
      imageUrl,
      publishedAt: typeof o.publishedAt === "string" ? o.publishedAt : undefined,
    });
  }
  return out.slice(0, TARGET_COUNT);
}

async function saveTodaySnapshot(
  dateKey: string,
  items: WcNewsItem[],
  model: string,
): Promise<Date> {
  const snap = await prisma.dashboardNewsSnapshot.upsert({
    where: { dateKey },
    create: {
      dateKey,
      items: items as object[],
      geminiModel: model,
    },
    update: {
      items: items as object[],
      geminiModel: model,
      fetchedAt: new Date(),
    },
  });
  return snap.fetchedAt;
}

export type DashboardNewsResult = {
  items: WcNewsItem[];
  fetchedAt: Date | null;
  dateKey: string;
  fromCache: boolean;
};

function isStaleNewsSnapshot(geminiModel: string | null | undefined): boolean {
  const source = geminiModel?.trim() ?? "";
  return source !== WC_NEWS_SCRAPER_SOURCE;
}

/** Încarcă știrile: cache instant pe dashboard; scraping RSS dacă lipsește snapshot azi sau e vechi (Gemini). */
export async function getTodayWcNews(): Promise<DashboardNewsResult> {
  const dateKey = todayDateKeyUtc();

  const existing = await prisma.dashboardNewsSnapshot.findUnique({
    where: { dateKey },
  });

  if (existing) {
    const cached = parseItems(existing.items);
    const stale = isStaleNewsSnapshot(existing.geminiModel);
    if (!stale && (cached.length > 0 || !REFRESH_ON_DASHBOARD_LOAD)) {
      return {
        items: cached,
        fetchedAt: existing.fetchedAt,
        dateKey,
        fromCache: true,
      };
    }
    if (stale) {
      console.info(
        "getTodayWcNews: snapshot vechi (Gemini) — reîmprospătare RSS",
      );
    }
  }

  try {
    const { items, source } = await fetchWc2026NewsViaScraper();
    const valid = items.slice(0, TARGET_COUNT);
    if (valid.length === 0) throw new Error("Scraper: zero știri valide");

    const fetchedAt = await saveTodaySnapshot(dateKey, valid, source);

    return {
      items: valid,
      fetchedAt,
      dateKey,
      fromCache: false,
    };
  } catch (e) {
    console.error("getTodayWcNews: RSS scrape failed", e);
    const latest = await prisma.dashboardNewsSnapshot.findFirst({
      orderBy: { fetchedAt: "desc" },
    });
    const fallback = latest ? parseItems(latest.items) : [];
    return {
      items: fallback,
      fetchedAt: latest?.fetchedAt ?? null,
      dateKey: latest?.dateKey ?? dateKey,
      fromCache: true,
    };
  }
}

/** Folosit de cron: forțează refresh pentru ziua curentă (UTC). */
export async function refreshTodayWcNews(): Promise<{
  dateKey: string;
  count: number;
  source: string;
}> {
  const dateKey = todayDateKeyUtc();
  const { items, source } = await fetchWc2026NewsViaScraper();
  const valid = items.slice(0, TARGET_COUNT);
  if (valid.length === 0) {
    throw new Error("Scraper-ul nu a returnat știri valide pentru CM 2026.");
  }

  await saveTodaySnapshot(dateKey, valid, source);

  return { dateKey, count: valid.length, source };
}
