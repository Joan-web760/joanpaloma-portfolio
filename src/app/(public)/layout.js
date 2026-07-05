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
        proactiveBubbleRotationDelay={6200}
        proactiveBubbleSequence={[
          {
            id: "hello",
            eyebrow: "Hi!",
            content: "Welcome! Looking for reliable virtual assistant support for admin, inbox, or daily operations?",
            delay: 1200,
          },
          {
            id: "visitor-type",
            eyebrow: "Quick question",
            content: "Are you a client, recruiter, business owner, or someone looking for organized remote support?",
            delay: 2600,
          },
          {
            id: "services",
            eyebrow: "Services",
            content: "I can explain Joan's services, from admin support and data entry to scheduling and customer support.",
            delay: 3000,
          },
          {
            id: "skills",
            eyebrow: "Skills",
            content: "Need to check Joan's strengths? I can summarize her tools, communication skills, and work style.",
            delay: 3000,
          },
          {
            id: "pricing",
            eyebrow: "Pricing",
            content: "Want to know which service package fits your needs? I can help compare Joan's pricing options.",
            delay: 3000,
          },
          {
            id: "availability",
            eyebrow: "Availability",
            content: "Ask me about Joan's availability, contact details, or the best way to start working with her.",
            delay: 3000,
          },
          {
            id: "portfolio-guide",
            eyebrow: "Portfolio guide",
            content: "Not sure where to start? I can guide you through Joan's experience, services, portfolio, and contact info.",
            delay: 3000,
          },
        ]}
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
