import { prisma } from "@/lib/prisma";
import { isAllowedNewsArticleUrl, type WcNewsItem } from "@/lib/gemini-wc-news";
import {
  dashboardNewsSnapshotKey,
  DASHBOARD_NEWS_LEAGUE_IDS,
  parseDashboardNewsLeague,
  type DashboardNewsLeagueId,
} from "@/lib/dashboard-news-leagues";
import {
  fetchLeagueNewsViaScraper,
  WC_NEWS_SCRAPER_SOURCE,
} from "@/lib/wc-news-scraper";

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
  snapshotKey: string,
  items: WcNewsItem[],
  model: string,
): Promise<Date> {
  const snap = await prisma.dashboardNewsSnapshot.upsert({
    where: { dateKey: snapshotKey },
    create: {
      dateKey: snapshotKey,
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
  leagueId: DashboardNewsLeagueId;
  fromCache: boolean;
};

function isStaleNewsSnapshot(geminiModel: string | null | undefined): boolean {
  const source = geminiModel?.trim() ?? "";
  return source !== WC_NEWS_SCRAPER_SOURCE;
}

/** Încarcă știrile pentru campionatul selectat. */
export async function getTodayDashboardNews(
  leagueInput?: string | null,
): Promise<DashboardNewsResult> {
  const leagueId = parseDashboardNewsLeague(leagueInput);
  const dateKey = todayDateKeyUtc();
  const snapshotKey = dashboardNewsSnapshotKey(leagueId, dateKey);

  const existing = await prisma.dashboardNewsSnapshot.findUnique({
    where: { dateKey: snapshotKey },
  });

  if (existing) {
    const cached = parseItems(existing.items);
    const stale = isStaleNewsSnapshot(existing.geminiModel);
    if (!stale && (cached.length > 0 || !REFRESH_ON_DASHBOARD_LOAD)) {
      return {
        items: cached,
        fetchedAt: existing.fetchedAt,
        dateKey,
        leagueId,
        fromCache: true,
      };
    }
    if (stale) {
      console.info(
        `getTodayDashboardNews(${leagueId}): snapshot vechi — reîmprospătare RSS`,
      );
    }
  }

  try {
    const { items, source } = await fetchLeagueNewsViaScraper(leagueId);
    const valid = items.slice(0, TARGET_COUNT);
    if (valid.length === 0) throw new Error("Scraper: zero știri valide");

    const fetchedAt = await saveTodaySnapshot(snapshotKey, valid, source);

    return {
      items: valid,
      fetchedAt,
      dateKey,
      leagueId,
      fromCache: false,
    };
  } catch (e) {
    console.error(`getTodayDashboardNews(${leagueId}): RSS scrape failed`, e);
    const latest = await prisma.dashboardNewsSnapshot.findFirst({
      where: { dateKey: { startsWith: `${leagueId}:` } },
      orderBy: { fetchedAt: "desc" },
    });
    const fallback = latest ? parseItems(latest.items) : [];
    return {
      items: fallback,
      fetchedAt: latest?.fetchedAt ?? null,
      dateKey: latest?.dateKey.split(":")[1] ?? dateKey,
      leagueId,
      fromCache: true,
    };
  }
}

/** @deprecated Folosește getTodayDashboardNews. */
export async function getTodayWcNews(): Promise<DashboardNewsResult> {
  return getTodayDashboardNews("RO");
}

/** Folosit de cron: forțează refresh pentru ziua curentă (UTC) și campionat. */
export async function refreshTodayDashboardNews(
  leagueId: DashboardNewsLeagueId,
): Promise<{
  dateKey: string;
  leagueId: DashboardNewsLeagueId;
  count: number;
  source: string;
}> {
  const dateKey = todayDateKeyUtc();
  const snapshotKey = dashboardNewsSnapshotKey(leagueId, dateKey);
  const { items, source } = await fetchLeagueNewsViaScraper(leagueId);
  const valid = items.slice(0, TARGET_COUNT);
  if (valid.length === 0) {
    throw new Error(`Scraper-ul nu a returnat știri valide pentru ${leagueId}.`);
  }

  await saveTodaySnapshot(snapshotKey, valid, source);

  return { dateKey, leagueId, count: valid.length, source };
}

export async function refreshAllDashboardNews(): Promise<
  Array<{ leagueId: DashboardNewsLeagueId; count: number; error?: string }>
> {
  const results: Array<{ leagueId: DashboardNewsLeagueId; count: number; error?: string }> = [];

  for (const leagueId of DASHBOARD_NEWS_LEAGUE_IDS) {
    try {
      const { count } = await refreshTodayDashboardNews(leagueId);
      results.push({ leagueId, count });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      results.push({ leagueId, count: 0, error: message });
    }
  }

  return results;
}

/** @deprecated Folosește refreshTodayDashboardNews sau refreshAllDashboardNews. */
export async function refreshTodayWcNews(): Promise<{
  dateKey: string;
  count: number;
  source: string;
}> {
  const result = await refreshTodayDashboardNews("RO");
  return {
    dateKey: result.dateKey,
    count: result.count,
    source: result.source,
  };
}
