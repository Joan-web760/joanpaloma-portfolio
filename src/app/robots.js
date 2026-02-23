import { getSiteUrl } from "@/lib/seo";

export default function robots() {
  const siteUrl = getSiteUrl().toString();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
