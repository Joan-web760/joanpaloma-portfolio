"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { ADMIN_NAV_ITEMS, ADMIN_NAV_SECTIONS, matchesAdminSearch } from "@/lib/admin-navigation";

const LIBRARY_SECTIONS = [...ADMIN_NAV_SECTIONS.slice(1), ADMIN_NAV_SECTIONS[0]];
const CONTENT_ITEMS = ADMIN_NAV_ITEMS.filter((item) => item.table);
const QUICK_TASKS = [
  { href: "/admin/home", title: "Edit your home page", description: "Update the first impression visitors see.", icon: "fa-display" },
  { href: "/admin/portfolio", title: "Update your projects", description: "Keep your latest work on display.", icon: "fa-images" },
  { href: "/admin/contact/inbox", title: "Read your messages", description: "See who has been in touch.", icon: "fa-inbox" },
];

function ContentStatus({ status, loading }) {
  if (loading) return <span className="admin-content-status">Checking…</span>;
  if (!status || status.error) return <span className="admin-content-status status-unavailable">Status unavailable</span>;
  if (!status.total) return <span className="admin-content-status status-empty">Nothing added yet</span>;
  if (!status.published) return <span className="admin-content-status status-draft">Hidden</span>;
  return <span className="admin-content-status status-published"><span aria-hidden="true" />{status.published} shown</span>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const searchId = useId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMap, setStatusMap] = useState({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All pages");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!alive) return;
        if (authError || !data?.user) {
          router.replace("/admin/login?next=/admin");
          return;
        }
        const { data: role, error: roleError } = await supabase.from("user_roles")
          .select("role").eq("user_id", data.user.id).maybeSingle();
        if (!alive) return;
        if (!roleError && role?.role !== "admin") {
          setError("Your account does not have admin access. Please contact the website owner.");
          return;
        }

        const results = await Promise.all(CONTENT_ITEMS.map(async (item) => {
          try {
            let totalQuery = supabase.from(item.table).select("*", { count: "exact", head: true });
            let publishedQuery = supabase.from(item.table).select("*", { count: "exact", head: true }).eq("is_published", true);
            if (item.singleton) {
              totalQuery = totalQuery.eq("id", 1);
              publishedQuery = publishedQuery.eq("id", 1);
            }
            const [total, published] = await Promise.all([totalQuery, publishedQuery]);
            if (total.error || published.error) return [item.href, { error: true }];
            return [item.href, { total: total.count || 0, published: published.count || 0 }];
          } catch {
            return [item.href, { error: true }];
          }
        }));
        if (alive) setStatusMap(Object.fromEntries(results));
      } catch {
        if (alive) setError("We could not check your content. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [router, reload]);

  const groups = LIBRARY_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.href !== "/admin" && matchesAdminSearch(item, query)),
  })).filter((section) => section.items.length && (category === "All pages" || category === section.title));
  const unavailable = Object.values(statusMap).some((status) => status.error);
  const publishedSections = Object.values(statusMap).filter((status) => status.published > 0).length;

  return (
    <div className="admin-dashboard">
      <section className="admin-welcome" aria-labelledby="admin-welcome-title">
        <div className="admin-welcome-copy">
          <span className="admin-eyebrow">Make yourself at home</span>
          <h2 id="admin-welcome-title">What would you like to update?</h2>
          <p>Your website, one simple change at a time. Choose a task below to get started.</p>
          <Link href="/admin/home" className="btn btn-primary">Edit home page<i className="fa-solid fa-arrow-right ms-2" aria-hidden="true" /></Link>
        </div>
        <div className="admin-welcome-note">
          <span className="admin-note-icon" aria-hidden="true"><i className="fa-regular fa-lightbulb" /></span>
          <strong>New here? Start with the basics.</strong>
          <p>Introduce yourself on the home page, add your work, then check your contact details.</p>
          <a href="#website-guide">How editing works <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section aria-labelledby="quick-tasks-title">
        <h2 id="quick-tasks-title" className="admin-section-heading">Everyday tasks</h2>
        <div className="admin-quick-grid">
          {QUICK_TASKS.map((task) => (
            <Link className="admin-quick-card" key={task.href} href={task.href}>
              <span className="admin-task-icon"><i className={`fa-solid ${task.icon}`} aria-hidden="true" /></span>
              <span><strong>{task.title}</strong><small>{task.description}</small></span>
              <i className="fa-solid fa-arrow-right admin-card-arrow" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-page-library" aria-labelledby="page-library-title">
        <div className="admin-library-header">
          <div>
            <h2 id="page-library-title" className="admin-section-heading">Manage your website</h2>
            <p>Find the part of your website you want to change.</p>
          </div>
          <div className="admin-menu-search admin-library-search">
            <label htmlFor={searchId} className="visually-hidden">Search website pages</label>
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input id={searchId} type="search" placeholder="Search pages or tasks…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        <div className="admin-library-filters" aria-label="Filter pages">
          {["All pages", ...ADMIN_NAV_SECTIONS.map((section) => section.title)].map((title) => (
            <button type="button" key={title} aria-pressed={category === title}
              className={category === title ? "active" : ""} onClick={() => setCategory(title)}>
              {title === "Overview" ? "Messages" : title}
            </button>
          ))}
        </div>
        <div className="admin-library-status" role="status">
          <span>{loading ? "Checking content status…" : error || (unavailable
            ? "Some content statuses are unavailable. You can still open the editors."
            : `${publishedSections} of ${CONTENT_ITEMS.length} content sections have published items.`)}</span>
          <button type="button" className="admin-text-button" onClick={() => setReload((value) => value + 1)} disabled={loading}>
            <i className="fa-solid fa-rotate-right me-1" aria-hidden="true" />Refresh status
          </button>
        </div>
        <div aria-live="polite">
          {groups.map((group) => (
            <div className="admin-library-group" key={group.title}>
              <h3>{group.title === "Overview" ? "Messages" : group.title}</h3>
              <div className="admin-page-grid">
                {group.items.map((item) => (
                  <Link href={item.href} key={item.href} className="admin-page-card">
                    <div className="admin-page-card-top">
                      <span className="admin-page-icon"><i className={`fa-solid ${item.icon}`} aria-hidden="true" /></span>
                      {item.table && <ContentStatus status={statusMap[item.href]} loading={loading} />}
                    </div>
                    <h4>{item.label}</h4>
                    <p>{item.hint}</p>
                    <span className="admin-page-card-action">Open {item.label.toLowerCase()} <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {!groups.length && (
            <div className="admin-library-empty">
              <h3>No matching pages</h3><p>Try another search, or show all pages to start again.</p>
              <button className="btn btn-outline-secondary" type="button" onClick={() => { setQuery(""); setCategory("All pages"); }}>Show all pages</button>
            </div>
          )}
        </div>
      </section>

      <section className="admin-editing-guide" id="website-guide" aria-labelledby="editing-guide-title">
        <h2 id="editing-guide-title" className="admin-section-heading">How editing works</h2>
        <ol>
          <li><span>1</span><div><strong>Choose a page</strong><p>Use a shortcut above or find it in the menu.</p></div></li>
          <li><span>2</span><div><strong>Make your changes</strong><p>Switch between editor sections to update text, images, or existing items.</p></div></li>
          <li><span>3</span><div><strong>Save and check</strong><p>Use the editor’s Save or Add button. Published items can appear on your website; open View website to check.</p></div></li>
        </ol>
      </section>
    </div>
  );
}
