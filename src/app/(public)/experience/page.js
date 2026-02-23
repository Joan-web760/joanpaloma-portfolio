import Navbar from "@/components/Navbar";
import ExperienceSection from "@/components/sections/ExperienceSection";
import { buildPageMetadata, getSiteDefaults, getSiteSettings } from "@/lib/seo";

export async function generateMetadata() {
  const site = await getSiteSettings();
  const { siteTitle, siteDescription } = getSiteDefaults(site);
  const description =
    siteDescription
      ? `Experience and work history for ${siteTitle}. ${siteDescription}`
      : `Work experience and career timeline for ${siteTitle}.`;

  return buildPageMetadata({ site, title: "Experience", description, path: "/experience" });
}

export default function ExperiencePage() {
  return (
    <>
      <Navbar />
      <main className="pt-5 pt-lg-5">
        <h1 className="visually-hidden">Work Experience</h1>
        <ExperienceSection />
      </main>
    </>
  );
}
