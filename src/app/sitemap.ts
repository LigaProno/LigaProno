import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-metadata";

/**
 * Doar rutele publice din `proxy.ts` — restul aplicației cere login, deci
 * pentru Googlebot ar fi doar redirect spre /sign-in. Nu le listăm.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().origin;
  const lastModified = new Date();

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/matches`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/sign-up`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/sign-in`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
