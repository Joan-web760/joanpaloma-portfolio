import { getSiteDefaults, getSiteSettings, getSiteUrl } from "@/lib/seo";

export async function generateMetadata() {
  const site = await getSiteSettings();
  const { siteTitle, siteDescription, siteKeywords, isPublished } = getSiteDefaults(site);

  return {
    metadataBase: getSiteUrl(),
    title: { default: siteTitle, template: `%s | ${siteTitle}` },
    description: siteDescription,
    keywords: siteKeywords || undefined,
    icons: { icon: "/favicon.ico" },
    robots: { index: isPublished, follow: true },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      type: "website",
      siteName: siteTitle,
      url: "/",
    },
    twitter: {
      card: "summary",
      title: siteTitle,
      description: siteDescription,
    },
  };
}

export default function PublicLayout({ children }) {
  return children;
}
