import Navbar from "@/components/Navbar";
import { buildPageMetadata, getContactSettings, getSiteDefaults, getSiteSettings, getSiteUrl } from "@/lib/seo";

import HomeSection from "@/components/sections/HomeSection";
import HomepageSections from "@/components/sections/HomepageSections";

export async function generateMetadata() {
  const site = await getSiteSettings();
  return buildPageMetadata({ site, path: "/" });
}

export default async function Page() {
  const site = await getSiteSettings();
  const contact = await getContactSettings();
  const { siteTitle, siteDescription } = getSiteDefaults(site);
  const siteUrl = getSiteUrl().toString();

  const sameAs = Object.values(contact?.socials || {}).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteTitle,
        url: siteUrl,
        description: siteDescription,
      },
      {
        "@type": "Person",
        name: siteTitle,
        url: siteUrl,
        description: siteDescription,
        ...(sameAs.length ? { sameAs } : {}),
        ...(contact?.public_email ? { email: contact.public_email } : {}),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main className="pt-5 pt-lg-5">
        <HomeSection />
        <HomepageSections />
      </main>
    </>
  );
}
