"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_NAV_SECTIONS = [
  {
    title: "Start Here",
    items: [
      { label: "Dashboard", href: "/admin", icon: "fa-gauge-high", hint: "Site overview" },
      { label: "Home", href: "/admin/home", icon: "fa-house", hint: "Hero section" },
      { label: "About", href: "/admin/about", icon: "fa-user-pen", hint: "Bio and media" },
    ],
  },
  {
    title: "Public Sections",
    items: [
      { label: "Services", href: "/admin/services", icon: "fa-briefcase", hint: "What you offer" },
      { label: "Skills", href: "/admin/skills", icon: "fa-wand-magic-sparkles", hint: "Capabilities" },
      { label: "Tools", href: "/admin/tools", icon: "fa-screwdriver-wrench", hint: "Software stack" },
      { label: "Experience", href: "/admin/experience", icon: "fa-timeline", hint: "Work history" },
      { label: "Portfolio", href: "/admin/portfolio", icon: "fa-image", hint: "Projects" },
      { label: "Certifications", href: "/admin/certifications", icon: "fa-certificate", hint: "Credentials" },
      { label: "Blog", href: "/admin/blog", icon: "fa-pen-nib", hint: "Articles" },
      { label: "Testimonials", href: "/admin/testimonials", icon: "fa-comment-dots", hint: "Social proof" },
    ],
  },
  {
    title: "Business Tools",
    items: [
      { label: "Pricing", href: "/admin/pricing", icon: "fa-tags", hint: "Packages" },
      { label: "Contact", href: "/admin/contact", icon: "fa-envelope-open-text", hint: "Contact section" },
      { label: "Footer", href: "/admin/footer", icon: "fa-table-cells-large", hint: "Footer links" },
      { label: "Contact Inbox", href: "/admin/contact/inbox", icon: "fa-inbox", hint: "Messages" },
      { label: "Chatbot Knowledge", href: "/admin/chatbot-knowledge", icon: "fa-brain", hint: "Bot answers" },
      { label: "Chatbot Logs", href: "/admin/chatbot-logs", icon: "fa-robot", hint: "Visitor chats" },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/admin/settings", icon: "fa-gear", hint: "Site setup" }],
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
                  <span className="admin-nav-link-copy">
                    <span>{item.label}</span>
                    {item.hint ? <small>{item.hint}</small> : null}
                  </span>
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
