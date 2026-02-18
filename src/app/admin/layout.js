// src/app/admin/layout.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopNav from "@/components/admin/AdminTopNav";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";

const HIDE_SHELL_ROUTES = ["/admin/login", "/admin/register"];

const PAGE_TITLES = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/home", label: "Home" },
  { href: "/admin/about", label: "About" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/skills", label: "Skills" },
  { href: "/admin/tools", label: "Tools" },
  { href: "/admin/experience", label: "Experience" },
  { href: "/admin/portfolio", label: "Portfolio" },
  { href: "/admin/certifications", label: "Certifications" },
  { href: "/admin/resume", label: "Resume" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/testimonials", label: "Testimonials" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/contact", label: "Contact" },
  { href: "/admin/contact/inbox", label: "Contact Inbox" },
  { href: "/admin/settings", label: "Settings" },
];

function resolvePageTitle(pathname) {
  if (!pathname) return "Admin";
  const match =
    PAGE_TITLES.find((entry) => entry.href === pathname) ||
    PAGE_TITLES.find((entry) => pathname.startsWith(`${entry.href}/`));
  return match?.label || "Admin";
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const hideShell = HIDE_SHELL_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

  if (hideShell) {
    return <div className="admin-shell">{children}</div>;
  }

  const pageTitle = resolvePageTitle(pathname);

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
              <div>
                <div className="admin-header-crumb">Admin / {pageTitle}</div>
                <div className="admin-header-title">{pageTitle}</div>
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
        </main>
      </div>
    </div>
  );
}
