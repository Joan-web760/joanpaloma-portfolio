"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminFooter from "@/components/admin/AdminFooter";
import AdminNav from "@/components/admin/AdminNav";
import AdminTopNav from "@/components/admin/AdminTopNav";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import { getAdminPage } from "@/lib/admin-navigation";
import "./admin.css";

const HIDE_SHELL_ROUTES = ["/admin/login", "/admin/register"];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const hideShell = HIDE_SHELL_ROUTES.some((route) => pathname === route || pathname?.startsWith(`${route}/`));
  if (hideShell) return <div className="admin-shell">{children}<AdminFooter /></div>;

  const page = getAdminPage(pathname);
  return (
    <div className="admin-shell">
      <a className="admin-skip-link" href="#admin-content">Skip to content</a>
      <div className="admin-layout">
        <div className="admin-nav-wrapper d-none d-lg-block"><AdminNav /></div>
        <main className="admin-main">
          <div className="d-lg-none"><AdminTopNav key={pathname} /></div>
          <header className="admin-header">
            <div className="admin-header-left">
              <div>
                <div className="admin-header-crumb">Your workspace</div>
                <h1 className="admin-header-title">{page.label}</h1>
                <p className="admin-header-help">{page.hint}</p>
              </div>
            </div>
            <div className="admin-header-actions">
              <AdminNotificationBell />
              <Link className="btn btn-outline-secondary btn-sm" href="/" target="_blank" rel="noreferrer">
                <i className="fa-solid fa-arrow-up-right-from-square me-2" aria-hidden="true" />View website
              </Link>
            </div>
          </header>
          <div className="admin-content" id="admin-content" tabIndex={-1}>{children}</div>
          <AdminFooter />
        </main>
      </div>
    </div>
  );
}
