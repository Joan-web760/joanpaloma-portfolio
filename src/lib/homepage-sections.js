// Sections that appear on the public homepage below the hero, in render order.
// The hero (HomeSection) is always shown and is not part of this list.
// Visibility is stored on section_home.homepage_sections as a JSON object
// keyed by `key`; a missing key means visible.

export const HOMEPAGE_SECTIONS = [
  { key: "portfolio", label: "Portfolio" },
  { key: "certifications", label: "Certifications" },
  { key: "services", label: "Services" },
  { key: "skills", label: "Skills" },
  { key: "blog", label: "Blog" },
  { key: "testimonials", label: "Testimonials" },
  { key: "pricing", label: "Pricing" },
  { key: "contact", label: "Contact" },
];

export function isHomepageSectionVisible(map, key) {
  return map?.[key] !== false;
}
