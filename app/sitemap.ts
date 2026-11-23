import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = BRAND.site.replace(/\/$/, "");
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${base}/chistka-mebeli-na-domu`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    { url: `${base}/contacts`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/offer`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    // /status is Disallow-ed in robots.txt, so listing it here would only feed
    // crawlers a URL they may not fetch.
  ];
}
