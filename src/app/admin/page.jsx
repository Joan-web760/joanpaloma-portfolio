"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const SECTIONS = [
  { key: "home", label: "Home", route: "/admin/home", table: "section_home", mode: "singleton", id: 1 },
  { key: "about", label: "About", route: "/admin/about", table: "section_about", mode: "singleton", id: 1 },

  { key: "services", label: "Services", route: "/admin/services", table: "service_items", mode: "list" },
  { key: "skills", label: "Skills", route: "/admin/skills", table: "skill_items", mode: "list" },
  { key: "tools", label: "Tools", route: "/admin/tools", table: "tool_items", mode: "list" },
  { key: "experience", label: "Work Experience", route: "/admin/experience", table: "experience_items", mode: "list" },

  { key: "portfolio", label: "Portfolio", route: "/admin/portfolio", table: "portfolio_items", mode: "list" },
  { key: "certifications", label: "Certifications", route: "/admin/certifications", table: "certification_items", mode: "list" },

  // section_resume is NOT a singleton in your schema (uuid PK) so treat as list
  { key: "resume", label: "Resume / CV", route: "/admin/resume", table: "section_resume", mode: "list" },

  { key: "blog", label: "Blog", route: "/admin/blog", table: "blog_posts", mode: "list" },
  { key: "testimonials", label: "Testimonials", route: "/admin/testimonials", table: "testimonial_items", mode: "list" },
  { key: "pricing", label: "Pricing", route: "/admin/pricing", table: "package_items", mode: "list" },

  // Contact has 2 related tables: settings + messages. We'll wire settings here.
  { key: "contact", label: "Contact", route: "/admin/contact", table: "section_contact_settings", mode: "list" },

  // Backgrounds/settings are lists
  { key: "settings", label: "Site Settings + Backgrounds", route: "/admin/settings", table: "site_settings", mode: "list" },
];

function fmtDate(val) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleString();
  } catch {
    return "—";
  }
}

function badgeClass(kind) {
  if (kind === "ready") return "text-bg-success";
  if (kind === "empty") return "text-bg-warning";
  if (kind === "error") return "text-bg-danger";
  return "text-bg-light border";
}

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [error, setError] = useState("");

  const [isAdmin, setIsAdmin] = useState(true);

  // section status map: key => { kind, statusText, updatedAt, published, totalCount, publishedCount }
  const [statusMap, setStatusMap] = useState({});

  const completion = useMemo(() => {
    const rows = SECTIONS.map((s) => statusMap[s.key]).filter(Boolean);

    const completed = rows.filter((r) => r.kind === "ready").length;
    const published = rows.filter((r) => r.published === true).length;

    return {
      total: SECTIONS.length,
      completed,
      published,
    };
  }, [statusMap]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (!alive) return;

      if (userErr || !userRes?.user) {
        router.replace("/admin/login?next=/admin");
        return;
      }

      setAuthEmail(userRes.user.email || "");

      // role check (optional)
      try {
        const { data: roleRow, error: roleErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userRes.user.id)
          .maybeSingle();

        if (!roleErr && roleRow?.role === "admin") setIsAdmin(true);
        else if (!roleErr && !roleRow) setIsAdmin(false);
      } catch {
        setIsAdmin(true);
      }

      // load statuses
      const nextMap = {};

      // helpers
      const loadSingleton = async (s) => {
        const { data, error: qErr } = await supabase
          .from(s.table)
          .select("is_published, updated_at")
          .eq("id", s.id)
          .maybeSingle();

        if (qErr) {
          nextMap[s.key] = {
            kind: "error",
            statusText: "Error",
            updatedAt: null,
            published: false,
            totalCount: 0,
            publishedCount: 0,
          };
          return;
        }

        if (!data) {
          nextMap[s.key] = {
            kind: "empty",
            statusText: "Empty",
            updatedAt: null,
            published: false,
            totalCount: 0,
            publishedCount: 0,
          };
          return;
        }

        nextMap[s.key] = {
          kind: "ready",
          statusText: "Ready",
          updatedAt: data.updated_at || null,
          published: !!data.is_published,
          totalCount: 1,
          publishedCount: data.is_published ? 1 : 0,
        };
      };

      const loadList = async (s) => {
        // Total count
        const totalRes = await supabase.from(s.table).select("*", { count: "exact", head: true });
        // Published count (only if table has is_published; yours do)
        const pubRes = await supabase.from(s.table).select("*", { count: "exact", head: true }).eq("is_published", true);

        // Latest updated_at
        const latestRes = await supabase
          .from(s.table)
          .select("updated_at, created_at, is_published")
          .order("updated_at", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        const anyErr = totalRes.error || pubRes.error || latestRes.error;

        if (anyErr) {
          nextMap[s.key] = {
            kind: "error",
            statusText: "Error",
            updatedAt: null,
            published: false,
            totalCount: 0,
            publishedCount: 0,
          };
          return;
        }

        const total = totalRes.count || 0;
        const publishedCount = pubRes.count || 0;

        // consider "published" true if at least 1 published row exists
        const published = publishedCount > 0;

        let kind = "empty";
        let statusText = "Empty";

        if (total > 0) {
          kind = "ready";
          statusText = published ? `Ready (${publishedCount}/${total} published)` : `Ready (${total} items)`;
        }

        const updatedAt = latestRes.data?.updated_at || latestRes.data?.created_at || null;

        nextMap[s.key] = {
          kind,
          statusText,
          updatedAt,
          published,
          totalCount: total,
          publishedCount,
        };
      };

      // Run sequentially (simpler + avoids rate limits); you can parallelize later if you want
      for (const s of SECTIONS) {
        if (s.mode === "singleton") await loadSingleton(s);
        else await loadList(s);
      }

      if (!alive) return;

      setStatusMap(nextMap);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  const openPreview = () => window.open("/", "_blank");

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        {/* Top Bar */}
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h4 mb-1">Admin Dashboard</h1>
            <div className="text-muted small">
              Logged in as <strong>{authEmail || "—"}</strong>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={openPreview}>
              <i className="fa-solid fa-eye me-2"></i>
              Preview Public Site
            </button>
            <button className="btn btn-outline-danger" onClick={logout}>
              <i className="fa-solid fa-right-from-bracket me-2"></i>
              Logout
            </button>
          </div>
        </div>

        {!isAdmin ? (
          <div className="alert alert-danger">
            <i className="fa-solid fa-shield-halved me-2"></i>
            You are authenticated but not authorized as an admin. Please assign your user as admin in Supabase.
          </div>
        ) : null}

        {error ? (
          <div className="alert alert-danger">
            <i className="fa-solid fa-triangle-exclamation me-2"></i>
            {error}
          </div>
        ) : null}

        {/* Stats Cards */}
        <div className="row g-3 mb-3">
          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-muted small">Sections</div>
                    <div className="h4 mb-0">{completion.total}</div>
                  </div>
                  <i className="fa-solid fa-layer-group fa-lg text-muted"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-muted small">Completed</div>
                    <div className="h4 mb-0">{completion.completed}</div>
                    <div className="small text-muted">Ready sections</div>
                  </div>
                  <i className="fa-solid fa-list-check fa-lg text-muted"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-muted small">Published</div>
                    <div className="h4 mb-0">{completion.published}</div>
                    <div className="small text-muted">Has published content</div>
                  </div>
                  <i className="fa-solid fa-bullhorn fa-lg text-muted"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Checklist Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
              <h2 className="h6 mb-0">Content Status & Shortcuts</h2>
              <span className="badge text-bg-secondary">Auto-wired from Supabase</span>
            </div>

            {loading ? (
              <div className="d-flex align-items-center gap-2 text-muted">
                <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                Loading dashboard...
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Section</th>
                      <th>Status</th>
                      <th>Last Updated</th>
                      <th>Published</th>
                      <th className="text-end" style={{ width: 220 }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTIONS.map((s) => {
                      const st = statusMap[s.key];

                      return (
                        <tr key={s.key}>
                          <td>
                            <div className="fw-semibold">{s.label}</div>
                            <div className="text-muted small">{s.key}</div>
                            <div className="text-muted small">
                              <code>{s.table}</code>
                            </div>
                          </td>

                          <td>
                            <span className={`badge ${badgeClass(st?.kind)}`}>
                              {st?.statusText || "Unknown"}
                            </span>
                          </td>

                          <td className="text-muted">{fmtDate(st?.updatedAt)}</td>

                          <td>
                            {st ? (
                              st.published ? (
                                <span className="badge text-bg-success">Yes</span>
                              ) : (
                                <span className="badge text-bg-light border">No</span>
                              )
                            ) : (
                              <span className="badge text-bg-light border">—</span>
                            )}
                          </td>

                          <td className="text-end">
                            <button className="btn btn-sm btn-primary" onClick={() => router.push(s.route)}>
                              <i className="fa-solid fa-pen-to-square me-2"></i>
                              Edit
                            </button>

                            <button
                              className="btn btn-sm btn-outline-secondary ms-2"
                              onClick={openPreview}
                              title="Preview public site"
                            >
                              <i className="fa-solid fa-up-right-from-square"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* <div className="mt-3 small text-muted">
              Notes:
              <ul className="mb-0">
                <li>
                  <code>home</code> and <code>about</code> are singleton rows (id=1).
                </li>
                <li>
                  List sections are considered “Published” if at least 1 row has <code>is_published=true</code>.
                </li>
              </ul>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
