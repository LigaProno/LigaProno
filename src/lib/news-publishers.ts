/** Doar publicații mari aprobate (domenii exacte / subdomenii). */
export const ALLOWED_NEWS_PUBLISHERS = [
  { host: "skysports.com", label: "Sky Sports", locale: "en" as const },
  { host: "sport.ro", label: "Sport.ro", locale: "ro" as const },
  { host: "stiripesurse.ro", label: "Știri pe surse", locale: "ro" as const },
  { host: "espn.com", label: "ESPN", locale: "en" as const },
  { host: "espn.co.uk", label: "ESPN", locale: "en" as const },
  { host: "golazo.ro", label: "Golazo România", locale: "ro" as const },
  { host: "golazoromania.ro", label: "Golazo România", locale: "ro" as const },
  { host: "gsp.ro", label: "GSP", locale: "ro" as const },
  { host: "antenasport.ro", label: "Antena Sport", locale: "ro" as const },
] as const;

export const ALLOWED_NEWS_PUBLISHER_LABELS = [
  ...new Set(ALLOWED_NEWS_PUBLISHERS.map((p) => p.label)),
];

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

export function getNewsArticleHostname(url: string): string | null {
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

export function isAllowedNewsArticleUrl(url: string): boolean {
  const host = getNewsArticleHostname(url);
  if (!host) return false;
  return ALLOWED_NEWS_PUBLISHERS.some(
    ({ host: allowed }) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

export function isRomanianNewsPublisherUrl(url: string): boolean {
  const host = getNewsArticleHostname(url);
  if (!host) return false;
  return ALLOWED_NEWS_PUBLISHERS.filter((p) => p.locale === "ro").some(
    ({ host: allowed }) => host === allowed || host.endsWith(`.${allowed}`),
  );
}
