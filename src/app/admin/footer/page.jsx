"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function AdminFooterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [site, setSite] = useState(null);
  const [draft, setDraft] = useState({
    site_title: "",
    footer_text: "",
    footer_tagline: "",
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/footer");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (loadError) {
        setError(loadError.message || "Failed to load footer settings.");
        setLoading(false);
        return;
      }

      setSite(data || null);
      setDraft({
        site_title: data?.site_title || "My Portfolio",
        footer_text: data?.footer_text || "",
        footer_tagline: data?.footer_tagline || "",
      });
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const dirty = useMemo(() => {
    if (!site) return false;
    return (
      (draft.site_title || "") !== (site.site_title || "") ||
      (draft.footer_text || "") !== (site.footer_text || "") ||
      (draft.footer_tagline || "") !== (site.footer_tagline || "")
    );
  }, [draft.footer_tagline, draft.footer_text, draft.site_title, site]);

  const save = async () => {
    if (!site?.id) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const patch = {
        site_title: draft.site_title.trim() || "My Portfolio",
        footer_text: draft.footer_text.trim() || null,
        footer_tagline: draft.footer_tagline.trim() || null,
      };

      const { data, error: saveError } = await supabase
        .from("site_settings")
        .update(patch)
        .eq("id", site.id)
        .select("*")
        .single();

      if (saveError) throw saveError;

      setSite(data);
      setDraft({
        site_title: data?.site_title || "My Portfolio",
        footer_text: data?.footer_text || "",
        footer_tagline: data?.footer_tagline || "",
      });
      setNotice("Footer settings saved.");
      setTimeout(() => setNotice(""), 2200);
    } catch (err) {
      setError(err?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading footer settings...
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">No row found in site_settings. Re-run the seed SQL.</div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100">
      <div className="container py-4">
        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
          <div>
            <h1 className="h5 mb-1">Footer</h1>
            <div className="small text-muted">
              Update the public footer text and brand name shown at the bottom of the frontend.
            </div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={() => window.open("/", "_blank")}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>
            <button className="btn btn-primary" disabled={busy || !dirty} onClick={save}>
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk me-2"></i>Save Footer
                </>
              )}
            </button>
          </div>
        </div>

        {error ? <div className="alert alert-danger">{error}</div> : null}
        {notice ? <div className="alert alert-success">{notice}</div> : null}

        <div className="row g-3">
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 mb-3">Footer Content</h2>

                <div className="mb-3">
                  <label className="form-label">Brand / Site Title</label>
                  <input
                    className="form-control"
                    value={draft.site_title}
                    onChange={(e) => setDraft((prev) => ({ ...prev, site_title: e.target.value }))}
                    disabled={busy}
                  />
                  <div className="form-text">Used in the footer title and copyright line.</div>
                </div>

                <div className="mb-0">
                  <label className="form-label">Footer Text</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Add your footer message here."
                    value={draft.footer_text}
                    onChange={(e) => setDraft((prev) => ({ ...prev, footer_text: e.target.value }))}
                    disabled={busy}
                  />
                  <div className="form-text">
                    This appears as the main description in the public footer.
                  </div>
                </div>

                <div className="mt-3">
                  <label className="form-label">Footer Bottom Line</label>
                  <input
                    className="form-control"
                    placeholder="Built for clarity, trust, and momentum."
                    value={draft.footer_tagline}
                    onChange={(e) => setDraft((prev) => ({ ...prev, footer_tagline: e.target.value }))}
                    disabled={busy}
                  />
                  <div className="form-text">
                    This appears on the bottom-right line of the public footer.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">Where the rest comes from</h2>
                <div className="small text-muted mb-3">
                  The public footer also pulls supporting details from existing admin sections, so you
                  only manage each piece in one place.
                </div>

                <div className="vstack gap-2">
                  <div className="border rounded p-3 bg-white">
                    <div className="fw-semibold">Contact links</div>
                    <div className="small text-muted">Email, phone, and social links come from Contact.</div>
                    <button className="btn btn-sm btn-outline-dark mt-2" onClick={() => router.push("/admin/contact")}>
                      Open Contact
                    </button>
                  </div>

                  <div className="border rounded p-3 bg-white">
                    <div className="fw-semibold">Global settings</div>
                    <div className="small text-muted">SEO and site-wide publishing controls stay in Settings.</div>
                    <button className="btn btn-sm btn-outline-dark mt-2" onClick={() => router.push("/admin/settings")}>
                      Open Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
