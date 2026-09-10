"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { ADMIN_NAV_SECTIONS, getAdminPage, matchesAdminSearch } from "@/lib/admin-navigation";

export { ADMIN_NAV_SECTIONS } from "@/lib/admin-navigation";

export default function AdminNav({ showHeader = true, showFooter = true, onSelect, className = "" }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const activePage = getAdminPage(pathname);
  const sections = ADMIN_NAV_SECTIONS.map((section) => ({
    ...section, items: section.items.filter((item) => matchesAdminSearch(item, query)),
  })).filter((section) => section.items.length);

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/admin/login");
    } catch {
      setError("Could not sign out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <nav className={`admin-nav ${className}`.trim()} aria-label="Admin navigation">
      {showHeader && (
        <Link href="/admin" className="admin-nav-header" onClick={onSelect}>
          <span className="admin-brand-mark" aria-hidden="true">JP</span>
          <span><span className="admin-nav-title">My portfolio</span><span className="admin-nav-subtitle">Website manager</span></span>
        </Link>
      )}
      <div className="admin-menu-search">
        <label htmlFor={searchId} className="visually-hidden">Find a page</label>
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input id={searchId} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a page…" />
      </div>
      <div className="admin-nav-scroll">
        {sections.map((section) => (
          <div key={section.title} className="admin-nav-section">
            <div className="admin-nav-section-title">{section.title}</div>
            <div className="admin-nav-links">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href} onClick={onSelect}
                  className={`admin-nav-link${activePage.href === item.href ? " active" : ""}`}
                  aria-current={activePage.href === item.href ? "page" : undefined} title={item.hint}>
                  <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
        {!sections.length && <p className="admin-search-empty" role="status">No pages found. Try “home” or “messages”.</p>}
      </div>
      {showFooter && (
        <div className="admin-nav-footer">
          <Link href="/" className="admin-nav-link" target="_blank" rel="noreferrer">
            <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /><span>View website</span>
          </Link>
          <button type="button" className="admin-nav-link admin-signout" onClick={signOut} disabled={signingOut}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /><span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
          {error && <p className="small text-danger mb-0" role="alert">{error}</p>}
        </div>
      )}
    </nav>
  );
}
