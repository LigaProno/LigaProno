import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-metadata";

/**
 * Zonele de mai jos cer login (vezi `proxy.ts`) sau sunt pagini tehnice de auth —
 * n-au ce căuta în index. Le blocăm explicit ca să nu se irosească crawl budget.
 */
const DISALLOW = [
  "/api/",
  "/admin",
  "/dashboard",
  "/profil",
  "/support",
  "/turnee",
  "/mini-jocuri",
  "/user-profile",
  "/sso-callback",
  "/reset-password",
];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().origin;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
