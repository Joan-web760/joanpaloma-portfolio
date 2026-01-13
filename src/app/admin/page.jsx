"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const SECTIONS = [
  { key: "home", label: "Home", route: "/admin/home" },
  { key: "about", label: "About", route: "/admin/about" },
  { key: "services", label: "Services", route: "/admin/services" },
  { key: "skills", label: "Skills", route: "/admin/skills" },
  { key: "experience", label: "Work Experience", route: "/admin/experience" },
  { key: "portfolio", label: "Portfolio", route: "/admin/portfolio" },
  { key: "certifications", label: "Certifications", route: "/admin/certifications" },
  { key: "resume", label: "Resume / CV", route: "/admin/resume" },
  { key: "blog", label: "Blog", route: "/admin/blog" },
  { key: "testimonials", label: "Testimonials", route: "/admin/testimonials" },
  { key: "pricing", label: "Pricing", route: "/admin/pricing" },
  { key: "contact", label: "Contact", route: "/admin/contact" },
  { key: "settings", label: "Site Settings + Backgrounds", route: "/admin/settings" },
];

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [error, setError] = useState("");

  const [isAdmin, setIsAdmin] = useState(true); // assume true if you haven't set roles yet

  const completion = useMemo(() => {
    // For now, completion is based on presence of routes in SECTIONS.
    // Later, compute completion from Supabase tables (has content + is_published).
    return {
      total: SECTIONS.length,
      completed: 0,
      published: 0,
    };
  }, []);

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

      // OPTIONAL: If you created user_roles earlier, enforce admin here.
      // If you did NOT create user_roles, this will error and we just skip.
      try {
        const { data: roleRow, error: roleErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userRes.user.id)
          .maybeSingle();

        if (!roleErr && roleRow?.role === "admin") {
          setIsAdmin(true);
        } else if (!roleErr && !roleRow) {
          setIsAdmin(false);
        }
      } catch {
        // If table doesn't exist, ignore (open admin for now)
        setIsAdmin(true);
      }

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

  const openPreview = () => {
    window.open("/", "_blank");
  };

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
                    <div className="small text-muted">Will auto-compute once tables exist</div>
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
                    <div className="small text-muted">Will reflect is_published later</div>
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
              <span className="badge text-bg-secondary">
                Status auto-fills after DB tables are created
              </span>
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
                      <th className="text-end" style={{ width: 220 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SECTIONS.map((s) => (
                      <tr key={s.key}>
                        <td>
                          <div className="fw-semibold">{s.label}</div>
                          <div className="text-muted small">{s.key}</div>
                        </td>
                        <td>
                          {/* Placeholder until tables exist */}
                          <span className="badge text-bg-light border">
                            Not wired
                          </span>
                        </td>
                        <td className="text-muted">
                          —
                        </td>
                        <td>
                          <span className="badge text-bg-light border">—</span>
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => router.push(s.route)}
                          >
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 small text-muted">
              Next step: create the section tables (home/about/services/etc.), then the dashboard will compute{" "}
              <code>updated_at</code> and <code>is_published</code> and enable publish toggles.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
