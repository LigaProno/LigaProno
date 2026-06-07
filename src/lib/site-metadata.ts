import type { Metadata } from "next";

export const SITE_NAME = "PronoHub";

export const SITE_TAGLINE_RO =
  "Pronosticuri Cupa Mondială 2026 — turnee private, clasament live și program meciuri.";

export const SITE_TAGLINE_EN =
  "FIFA World Cup 2026 predictions — private tournaments, live leaderboard and fixtures.";

const SITE_KEYWORDS = [
  "PronoHub",
  "Cupa Mondială 2026",
  "FIFA World Cup 2026",
  "pronosticuri fotbal",
  "turnee private",
  "clasament pronosticuri",
  "program meciuri CM 2026",
];

/** URL public al aplicației — setează NEXT_PUBLIC_APP_URL în producție (ex. https://pronohub.vercel.app). */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return new URL(explicit.startsWith("http") ? explicit : `https://${explicit}`);
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return new URL(`https://${vercel}`);
  }
  return new URL("http://localhost:3000");
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const title = `${SITE_NAME} — Cupa Mondială 2026`;

  return {
    metadataBase: siteUrl,
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_TAGLINE_RO,
    applicationName: SITE_NAME,
    keywords: SITE_KEYWORDS,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    openGraph: {
      type: "website",
      locale: "ro_RO",
      alternateLocale: ["en_US"],
      url: siteUrl,
      siteName: SITE_NAME,
      title,
      description: SITE_TAGLINE_RO,
    },
    twitter: {
      card: "summary",
      title,
      description: SITE_TAGLINE_RO,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function pageTitle(segment: string): Metadata {
  return { title: segment };
}
