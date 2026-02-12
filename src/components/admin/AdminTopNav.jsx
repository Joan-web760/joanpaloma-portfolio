"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_SECTIONS } from "@/components/admin/AdminNav";

function isActivePath(pathname, href) {
  if (!pathname) return false;
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminTopNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-topnav" aria-label="Admin navigation">
      <div className="admin-topnav-bar">
        <div className="admin-topnav-brand">
          <span className="admin-topnav-brand-title">Admin Studio</span>
          <span className="admin-topnav-brand-sub">Content &amp; Portfolio</span>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm admin-topnav-toggle"
          data-bs-toggle="collapse"
          data-bs-target="#adminTopNavPanel"
          aria-controls="adminTopNavPanel"
          aria-expanded="false"
          aria-label="Toggle admin navigation"
        >
          <i className="fa-solid fa-bars"></i>
        </button>
      </div>

      <div id="adminTopNavPanel" className="collapse admin-topnav-panel admin-topnav-panel--responsive">
        {ADMIN_NAV_SECTIONS.map((section) => (
          <div key={section.title} className="admin-topnav-group">
            <div className="admin-topnav-title">{section.title}</div>
          <ul className="admin-topnav-links">
            {section.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`admin-topnav-link${active ? " active" : ""}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      </div>
    </nav>
  );
}
