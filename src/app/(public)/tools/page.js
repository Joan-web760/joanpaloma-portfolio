import Navbar from "@/components/Navbar";
import ToolsSection from "@/components/sections/ToolsSection";
import { buildPageMetadata, getSiteDefaults, getSiteSettings } from "@/lib/seo";

export async function generateMetadata() {
  const site = await getSiteSettings();
  const { siteTitle, siteDescription } = getSiteDefaults(site);
  const description =
    siteDescription
      ? `Tools used by ${siteTitle}. ${siteDescription}`
      : `Tools, platforms, and software used by ${siteTitle}.`;

  return buildPageMetadata({ site, title: "Tools", description, path: "/tools" });
}

export default function ToolsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-5 pt-lg-5">
        <h1 className="visually-hidden">Tools</h1>
        <ToolsSection />
      </main>
    </>
  );
}
