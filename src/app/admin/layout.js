// src/app/admin/layout.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminFooter from "@/components/admin/AdminFooter";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopNav from "@/components/admin/AdminTopNav";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";

const HIDE_SHELL_ROUTES = ["/admin/login", "/admin/register"];

const PAGE_TITLES = [
  { href: "/admin", label: "Dashboard", help: "Review site status and jump to the section you need." },
  { href: "/admin/home", label: "Home", help: "Edit the first section visitors see on the public site." },
  { href: "/admin/about", label: "About", help: "Update bio, values, profile media, and story details." },
  { href: "/admin/services", label: "Services", help: "Add, edit, reorder, and publish service cards." },
  { href: "/admin/skills", label: "Skills", help: "Manage skills, levels, categories, and display order." },
  { href: "/admin/tools", label: "Tools", help: "Manage the software and tools shown publicly." },
  { href: "/admin/experience", label: "Experience", help: "Create work entries, then organize and publish them." },
  { href: "/admin/portfolio", label: "Portfolio", help: "Manage public projects, media, links, and results." },
  { href: "/admin/certifications", label: "Certifications", help: "Add credentials and control their public order." },
  { href: "/admin/blog", label: "Blog", help: "Draft posts, use AI assistance, and manage published articles." },
  { href: "/admin/testimonials", label: "Testimonials", help: "Create social proof, review AI drafts, and choose what is public." },
  { href: "/admin/pricing", label: "Pricing", help: "Build packages, inclusions, add-ons, and featured offers." },
  { href: "/admin/contact", label: "Contact", help: "Edit contact copy, email, socials, booking link, and hours." },
  { href: "/admin/footer", label: "Footer", help: "Update footer links, contact details, and closing text." },
  { href: "/admin/contact/inbox", label: "Contact Inbox", help: "Review messages sent from the public contact form." },
  { href: "/admin/chatbot-knowledge", label: "Chatbot Knowledge", help: "Teach the public assistant approved answers." },
  { href: "/admin/chatbot-logs", label: "Chatbot Logs", help: "Review visitor conversations with the assistant." },
  { href: "/admin/settings", label: "Settings", help: "Manage site-wide SEO, branding, backgrounds, and system options." },
];

function resolvePageMeta(pathname) {
  if (!pathname) return { label: "Admin", help: "Manage the public portfolio content." };
  const match =
    PAGE_TITLES.find((entry) => entry.href === pathname) ||
    PAGE_TITLES.find((entry) => pathname.startsWith(`${entry.href}/`));
  return match || { label: "Admin", help: "Manage the public portfolio content." };
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const hideShell = HIDE_SHELL_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (hideShell) {
    return (
      <div className="admin-shell">
        {children}
        <AdminFooter />
      </div>
    );
  }

  const pageMeta = resolvePageMeta(pathname);

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <div className="admin-nav-wrapper d-none d-lg-block">
          <AdminNav />
        </div>

        <main className="admin-main">
          <div className="d-lg-none">
            <AdminTopNav />
          </div>

          <div className="admin-header">
            <div className="admin-header-left">
              <div className="admin-header-icon" aria-hidden="true">
                <i className="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <div className="admin-header-crumb">Admin workspace</div>
                <div className="admin-header-title">{pageMeta.label}</div>
                <div className="admin-header-help">{pageMeta.help}</div>
              </div>
            </div>

            <div className="admin-header-actions">
              <AdminNotificationBell />
              <Link className="btn btn-outline-dark btn-sm" href="/" target="_blank" rel="noreferrer">
                <i className="fa-solid fa-eye me-2"></i>
                Preview
              </Link>
              <Link className="btn btn-outline-primary btn-sm" href="/admin/settings">
                <i className="fa-solid fa-sliders me-2"></i>
                Settings
              </Link>
            </div>
          </div>

          <div className="admin-content">{children}</div>
          <AdminFooter />
        </main>
      </div>
    </div>
  );
}
