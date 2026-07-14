import { callGeminiJson, getGeminiApiKey } from "@/lib/gemini-odds-fetch";
import { enrichAndValidateNewsItems, type WcNewsItem } from "@/lib/news-article-meta";
import {
  ALLOWED_NEWS_PUBLISHERS,
  ALLOWED_NEWS_PUBLISHER_LABELS,
  isAllowedNewsArticleUrl,
  isRomanianNewsPublisherUrl,
} from "@/lib/news-publishers";

export type { WcNewsItem };
export {
  ALLOWED_NEWS_PUBLISHERS,
  ALLOWED_NEWS_PUBLISHER_LABELS,
  isAllowedNewsArticleUrl,
  getNewsArticleHostname,
} from "@/lib/news-publishers";

const DEFAULT_MODEL = "gemini-2.5-flash";
const TARGET_NEWS_COUNT = 5;
const GEMINI_NEWS_TIMEOUT_MS = 120_000;

/** Fallback Unsplash — URL-uri verificate. */
export const NEWS_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80",
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0971?w=800&q=80",
  "https://images.unsplash.com/photo-1489944440615-453c276550bc?w=800&q=80",
] as const;

export function resolveNewsImageUrl(item: WcNewsItem, index: number): string {
  const img = item.imageUrl?.trim();
  if (img.startsWith("https://")) return img;
  return NEWS_FALLBACK_IMAGES[index % NEWS_FALLBACK_IMAGES.length];
}

function model(): string {
  return (process.env.GEMINI_NEWS_MODEL ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function allowedSitesBlock(): string {
  return ALLOWED_NEWS_PUBLISHERS.map((p) => `- ${p.label} → https://${p.host}/`).join("\n");
}

function newsPrompt(todayIso: string): string {
  return `Ești editor sportiv pentru Liga Prono (România). Data: ${todayIso}.

Folosește Google Search. Găsește exact ${TARGET_NEWS_COUNT} articole REALE, publicate recent, despre Cupa Mondială 2026.

DOAR aceste domenii (URL-ul articolului trebuie să fie pe unul dintre ele):
${allowedSitesBlock()}

Reguli stricte:
- Copiază URL-ul EXACT din rezultatul căutării (pagină articol, nu homepage, nu inventa linkuri).
- Minim 3 articole de pe site-uri românești (sport.ro, gsp.ro, antenasport.ro, stiripesurse.ro).
- Titlu și rezumat în română; rezumat max 200 caractere.

Răspunde DOAR cu JSON valid:
{"items":[{"title":"...","summary":"...","url":"https://www.gsp.ro/...","source":"GSP","imageUrl":"","publishedAt":"2026-06-01"}]}`;
}

function normalizeItems(raw: unknown): WcNewsItem[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const list = Array.isArray(root.items) ? root.items : Array.isArray(raw) ? raw : [];
  const out: WcNewsItem[] = [];

  for (const row of list) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    let url = typeof o.url === "string" ? o.url.trim() : "";
    if (url && !url.startsWith("http")) url = `https://${url}`;
    const summary = typeof o.summary === "string" ? o.summary.trim() : "";
    const source = typeof o.source === "string" ? o.source.trim() : "Sport";
    if (!title || !url.startsWith("https://")) continue;
    if (!isAllowedNewsArticleUrl(url)) continue;

    out.push({
      title,
      summary: summary.slice(0, 280) || title,
      url,
      source,
      imageUrl: "",
      publishedAt: typeof o.publishedAt === "string" ? o.publishedAt : undefined,
    });
  }

  return out;
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

async function fetchNewsFromGemini(
  apiKey: string,
  m: string,
  todayIso: string,
): Promise<WcNewsItem[]> {
  const raw = await callGeminiJson(apiKey, m, newsPrompt(todayIso), {
    googleSearch: true,
    timeoutMs: GEMINI_NEWS_TIMEOUT_MS,
  });
  return normalizeItems(raw);
}

export async function fetchWc2026NewsViaGemini(): Promise<{
  items: WcNewsItem[];
  model: string;
}> {
  const apiKey = getGeminiApiKey();
  const m = model();
  const todayIso = new Date().toISOString().slice(0, 10);

  let candidates: WcNewsItem[] = [];

  try {
    candidates = rankNews(await fetchNewsFromGemini(apiKey, m, todayIso));
  } catch (e) {
    console.warn("fetchWc2026NewsViaGemini: primul apel eșuat", e);
  }

  if (candidates.length < TARGET_NEWS_COUNT) {
    try {
      const retry = rankNews(await fetchNewsFromGemini(apiKey, m, todayIso));
      candidates = rankNews([...candidates, ...retry]);
    } catch (e) {
      console.warn("fetchWc2026NewsViaGemini: al doilea apel eșuat", e);
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      "Gemini nu a returnat articole. Rulează /api/cron/wc-news când ai timp (poate dura 1–2 min).",
    );
  }

  const toValidate = candidates.slice(0, TARGET_NEWS_COUNT + 2);
  const validated = await enrichAndValidateNewsItems(toValidate, NEWS_FALLBACK_IMAGES);
  const items = rankNews(validated).slice(0, TARGET_NEWS_COUNT);

  if (items.length === 0) {
    throw new Error(
      "Niciun link valid — Gemini a inventat URL-uri sau site-urile nu răspund.",
    );
  }

  if (items.length < TARGET_NEWS_COUNT) {
    console.warn(
      `fetchWc2026NewsViaGemini: ${items.length}/${TARGET_NEWS_COUNT} după validare.`,
    );
  }

  return { items, model: m };
}
