import { isAllowedNewsArticleUrl } from "@/lib/news-publishers";

export type WcNewsItem = {
  title: string;
  summary: string;
  url: string;
  source: string;
  imageUrl: string;
  publishedAt?: string;
};

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; Liga Prono/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.5",
};

const META_TIMEOUT_MS = 10_000;

function normalizeImageUrl(raw: string, pageUrl: string): string | null {
  let u = raw.trim().replace(/&amp;/g, "&");
  if (!u) return null;
  if (u.startsWith("//")) u = `https:${u}`;
  if (u.startsWith("/")) {
    try {
      u = new URL(u, pageUrl).href;
    } catch {
      return null;
    }
  }
  if (!u.startsWith("http")) return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function extractMetaImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/gi,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/gi,
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(html);
    if (m?.[1]) {
      const img = normalizeImageUrl(m[1], pageUrl);
      if (img) return img;
    }
  }
  return null;
}

/** Verifică dacă articolul există (nu e URL inventat de model). */
export async function isArticleUrlReachable(url: string): Promise<boolean> {
  if (!isAllowedNewsArticleUrl(url)) return false;
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
    });
    const ct = res.headers.get("content-type") ?? "";
    return res.ok && (ct.includes("text/html") || ct.includes("application/json"));
  } catch {
    return false;
  }
}

/** Extrage og:image / twitter:image din HTML-ul articolului. */
export async function fetchArticleOgImage(articleUrl: string): Promise<string | null> {
  if (!isAllowedNewsArticleUrl(articleUrl)) return null;
  try {
    const res = await fetch(articleUrl, {
      method: "GET",
      redirect: "follow",
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html.includes("<")) return null;
    return extractMetaImage(html.slice(0, 250_000), res.url || articleUrl);
  } catch {
    return null;
  }
}

export async function enrichNewsItemWithMeta(
  item: WcNewsItem,
  index: number,
  fallbackImages: readonly string[],
): Promise<WcNewsItem | null> {
  const reachable = await isArticleUrlReachable(item.url);
  if (!reachable) {
    console.warn(`Articol respins (URL inaccesibil): ${item.url}`);
    return null;
  }

  let imageUrl = item.imageUrl?.trim() ?? "";
  if (!imageUrl.startsWith("https://")) {
    const og = await fetchArticleOgImage(item.url);
    if (og) imageUrl = og;
  }

  if (!imageUrl.startsWith("https://")) {
    imageUrl = fallbackImages[index % fallbackImages.length] ?? "";
  }

  return { ...item, imageUrl };
}

export async function enrichAndValidateNewsItems(
  items: WcNewsItem[],
  fallbackImages: readonly string[],
): Promise<WcNewsItem[]> {
  const results = await Promise.all(
    items.map((item, i) => enrichNewsItemWithMeta(item, i, fallbackImages)),
  );
  return results.filter((x): x is WcNewsItem => x != null);
}
