import PublicFooter from "@/components/PublicFooter";
import PublicAosProvider from "@/components/PublicAosProvider";
import PublicChatbotGate from "@/components/chatbot/PublicChatbotGate";
import { getContactSettings, getSiteDefaults, getSiteSettings, getSiteUrl } from "@/lib/seo";

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

export default async function PublicLayout({ children }) {
  const [site, contact] = await Promise.all([getSiteSettings(), getContactSettings()]);

  return (
    <>
      <PublicAosProvider />
      {children}
      <PublicFooter site={site} contact={contact} />
      <PublicChatbotGate
        projectName="Joan Paloma Portfolio"
        contextConfig={[
          { name: "site_settings", limit: 1 },
          { name: "section_home", limit: 1 },
          { name: "section_about", limit: 1 },
          { name: "services", limit: 8, orderBy: "sort_order", ascending: true },
          { name: "skills", limit: 8, orderBy: "sort_order", ascending: true },
          { name: "portfolio", limit: 6, orderBy: "sort_order", ascending: true },
          { name: "experience", limit: 6, orderBy: "sort_order", ascending: true },
          { name: "pricing", limit: 6, orderBy: "sort_order", ascending: true },
          { name: "contact", limit: 1 },
          { name: "chatbot_knowledge", limit: 10, orderBy: "priority", ascending: false },
        ]}
      />
    </>
  );
}
