"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: "fa-gauge-high" },
      { label: "Home", href: "/admin/home", icon: "fa-house" },
      { label: "About", href: "/admin/about", icon: "fa-user-pen" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Services", href: "/admin/services", icon: "fa-briefcase" },
      { label: "Skills", href: "/admin/skills", icon: "fa-wand-magic-sparkles" },
      { label: "Tools", href: "/admin/tools", icon: "fa-screwdriver-wrench" },
      { label: "Experience", href: "/admin/experience", icon: "fa-timeline" },
      { label: "Portfolio", href: "/admin/portfolio", icon: "fa-image" },
      { label: "Certifications", href: "/admin/certifications", icon: "fa-certificate" },
      { label: "Resume", href: "/admin/resume", icon: "fa-file-lines" },
      { label: "Blog", href: "/admin/blog", icon: "fa-pen-nib" },
      { label: "Testimonials", href: "/admin/testimonials", icon: "fa-comment-dots" },
    ],
  },
  {
    title: "Business",
    items: [
      { label: "Pricing", href: "/admin/pricing", icon: "fa-tags" },
      { label: "Contact", href: "/admin/contact", icon: "fa-envelope-open-text" },
      { label: "Contact Inbox", href: "/admin/contact/inbox", icon: "fa-inbox" },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/admin/settings", icon: "fa-gear" }],
  },
];

function isActivePath(pathname, href) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav({
  showHeader = true,
  showFooter = true,
  closeOnSelect = false,
  className = "",
}) {
  const pathname = usePathname();

  return (
    <aside className={`admin-nav ${className}`.trim()}>
      {showHeader ? (
        <div className="admin-nav-header">
          <div className="admin-nav-title">Admin Studio</div>
          <div className="admin-nav-subtitle">Content &amp; Portfolio</div>
        </div>
      ) : null}

      {ADMIN_NAV_SECTIONS.map((section) => (
        <div key={section.title} className="admin-nav-section">
          <div className="admin-nav-section-title">{section.title}</div>
          <div className="admin-nav-links">
            {section.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-nav-link${active ? " active" : ""}`}
                  {...(closeOnSelect ? { "data-bs-dismiss": "offcanvas" } : {})}
                >
                  <i className={`fa-solid ${item.icon}`}></i>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {showFooter ? (
        <div className="admin-nav-footer">
          <Link href="/" className="admin-nav-link" target="_blank" rel="noreferrer">
            <i className="fa-solid fa-arrow-up-right-from-square"></i>
            <span>Preview Site</span>
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
