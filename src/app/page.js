import Navbar from "@/components/Navbar";

import HomeSection from "@/components/sections/HomeSection";
import ServicesSection from "@/components/sections/ServicesSection";
import SkillsSection from "@/components/sections/SkillsSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import PortfolioSection from "@/components/sections/PortfolioSection";
import CertificationsSection from "@/components/sections/CertificationsSection";
import ResumeSection from "@/components/sections/ResumeSection";
import BlogSection from "@/components/sections/BlogSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import PricingSection from "@/components/sections/PricingSection";
import ContactSection from "@/components/sections/ContactSection";

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <HomeSection />
        <ServicesSection />
        <SkillsSection />
        <ExperienceSection />
        <PortfolioSection />
        <CertificationsSection />
        <ResumeSection />
        <BlogSection />
        <TestimonialsSection />
        <PricingSection />
        <ContactSection />
      </main>
    </>
  );
}
