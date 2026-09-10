"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { HOMEPAGE_SECTIONS, isHomepageSectionVisible } from "@/lib/homepage-sections";

import ServicesSection from "@/components/sections/ServicesSection";
import SkillsSection from "@/components/sections/SkillsSection";
import PortfolioSection from "@/components/sections/PortfolioSection";
import CertificationsSection from "@/components/sections/CertificationsSection";
import BlogSection from "@/components/sections/BlogSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import PricingSection from "@/components/sections/PricingSection";
import ContactSection from "@/components/sections/ContactSection";

const SECTION_COMPONENTS = {
  portfolio: PortfolioSection,
  certifications: CertificationsSection,
  services: ServicesSection,
  skills: SkillsSection,
  blog: BlogSection,
  testimonials: TestimonialsSection,
  pricing: PricingSection,
  contact: ContactSection,
};

export default function HomepageSections() {
  // Default: every section visible. The Home editor can hide any of them.
  const [visibility, setVisibility] = useState({});

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("section_home")
        .select("homepage_sections")
        .eq("id", 1)
        .eq("is_published", true)
        .maybeSingle();

      if (!alive) return;
      if (error) {
        console.error("HomepageSections load error:", error);
        return;
      }

      const map = data?.homepage_sections;
      setVisibility(map && typeof map === "object" ? map : {});
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      {HOMEPAGE_SECTIONS.map(({ key }) => {
        const SectionComponent = SECTION_COMPONENTS[key];
        if (!SectionComponent || !isHomepageSectionVisible(visibility, key)) return null;
        return <SectionComponent key={key} />;
      })}
    </>
  );
}
