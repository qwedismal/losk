import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = BRAND.site.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private surfaces: never indexed, never crawled.
        disallow: ["/admin", "/admin/", "/api/", "/t/", "/pay/", "/status", "/offline"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
