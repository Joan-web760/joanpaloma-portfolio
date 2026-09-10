"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminPageShell from "@/components/admin/AdminPageShell";
import AdminSection from "@/components/admin/AdminSection";

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
      setNotice("Saved.");
      setTimeout(() => setNotice(""), 2200);
    } catch (err) {
      setError(err?.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted py-4">
        <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
        Loading the Footer editor…
      </div>
    );
  }

  if (!site) {
    return (
      <AdminPageShell error="No settings row was found. Re-run the seed SQL for site_settings." />
    );
  }

  return (
    <AdminPageShell
      preview="/"
      previewLabel="View website"
      dirty={dirty}
      saving={busy}
      onSave={save}
      error={error}
      notice={notice}
    >
      <AdminSection
        title="Footer content"
        description="The text and brand name shown at the very bottom of every public page."
      >
        <div className="mb-3">
          <label className="form-label">Brand / site name</label>
          <input
            className="form-control"
            value={draft.site_title}
            onChange={(e) => setDraft((prev) => ({ ...prev, site_title: e.target.value }))}
            disabled={busy}
          />
          <div className="form-text">Used in the footer title and the copyright line.</div>
        </div>

        <div className="mb-3">
          <label className="form-label">Footer text</label>
          <textarea
            className="form-control"
            rows={4}
            placeholder="Add your footer message here."
            value={draft.footer_text}
            onChange={(e) => setDraft((prev) => ({ ...prev, footer_text: e.target.value }))}
            disabled={busy}
          />
          <div className="form-text">The main description in the public footer.</div>
        </div>

        <div className="mb-0">
          <label className="form-label">Bottom line</label>
          <input
            className="form-control"
            placeholder="Built for clarity, trust, and momentum."
            value={draft.footer_tagline}
            onChange={(e) => setDraft((prev) => ({ ...prev, footer_tagline: e.target.value }))}
            disabled={busy}
          />
          <div className="form-text">Shows on the bottom-right line of the public footer.</div>
        </div>
      </AdminSection>

      <AdminSection
        title="Where the rest comes from"
        description="The footer also pulls details you manage in other places, so you only edit each thing once."
      >
        <div className="vstack gap-2">
          <div className="border rounded p-3 bg-white">
            <div className="fw-semibold">Contact links</div>
            <div className="small text-muted">Email, phone, and social links come from Contact details.</div>
            <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => router.push("/admin/contact")}>
              Open Contact details
            </button>
          </div>

          <div className="border rounded p-3 bg-white">
            <div className="fw-semibold">Site settings</div>
            <div className="small text-muted">Search appearance and site-wide publishing stay in Site settings.</div>
            <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => router.push("/admin/settings")}>
              Open Site settings
            </button>
          </div>
        </div>
      </AdminSection>
    </AdminPageShell>
  );
}
