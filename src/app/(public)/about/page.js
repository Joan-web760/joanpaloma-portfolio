import Navbar from "@/components/Navbar";
import AboutSection from "@/components/sections/AboutSection";
import { buildPageMetadata, getSiteDefaults, getSiteSettings } from "@/lib/seo";

export async function generateMetadata() {
  const site = await getSiteSettings();
  const { siteTitle, siteDescription } = getSiteDefaults(site);
  const description =
    siteDescription
      ? `About ${siteTitle}. ${siteDescription}`
      : `About ${siteTitle} and professional background.`;

  return buildPageMetadata({ site, title: "About", description, path: "/about" });
}

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-5 pt-lg-5">
        <h1 className="visually-hidden">About</h1>
        <AboutSection />
      </main>
    </>
  );
}
