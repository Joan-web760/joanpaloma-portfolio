"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const sectionKeys = [
  "home","about","services","skills","experience","portfolio",
  "certifications","resume","blog","testimonials","pricing","contact"
];

export default function AdminSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [site, setSite] = useState(null);
  const [bgs, setBgs] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/settings");
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      const { data: bg, error: bgErr } = await supabase
        .from("section_backgrounds")
        .select("*")
        .order("section_key", { ascending: true });

      if (!alive) return;

      if (sErr || bgErr) {
        setError((sErr?.message || bgErr?.message) || "Failed to load settings.");
        setLoading(false);
        return;
      }

      setSite(s || null);
      setBgs(bg || []);
      setLoading(false);
    })();

    return () => { alive = false; };
  }, [router]);

  const toast = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2000);
  };

  const bgByKey = useMemo(() => {
    const map = {};
    for (const k of sectionKeys) map[k] = null;
    for (const x of bgs) map[x.section_key] = x;
    return map;
  }, [bgs]);

  const bgUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from("portfolio-backgrounds").getPublicUrl(path).data.publicUrl;
  };

  const saveSite = async (patch) => {
    if (!site?.id) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("site_settings")
        .update(patch)
        .eq("id", site.id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setSite(data);
      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveBg = async (id, patch) => {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data, error: updErr } = await supabase
        .from("section_backgrounds")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updErr) throw updErr;

      setBgs((prev) => prev.map((x) => (x.id === id ? data : x)));
      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const uploadBg = async (sectionKey, file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png","jpg","jpeg","webp"].includes(ext) ? ext : "png";
    const filename = `${sectionKey}_${crypto.randomUUID()}.${safeExt}`;
    const path = `sections/${sectionKey}/${filename}`;

    const { error: upErr } = await supabase.storage
      .from("portfolio-backgrounds")
      .upload(path, file, { upsert: false });

    if (upErr) throw upErr;
    return path;
  };

  const removeBgFile = async (path) => {
    if (!path) return;
    await supabase.storage.from("portfolio-backgrounds").remove([path]);
  };

  const openPreview = () => window.open("/", "_blank");

  if (loading) {
    return (
      <div className="container py-5">
        <div className="d-flex align-items-center gap-2 text-muted">
          <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
          Loading Settings...
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
            <h1 className="h5 mb-1">Global Settings</h1>
            <div className="small text-muted">Branding, SEO defaults, footer, and per-section backgrounds.</div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-dark" onClick={openPreview}>
              <i className="fa-solid fa-eye me-2"></i>Preview
            </button>
            <button className="btn btn-outline-primary" onClick={() => router.push("/admin")}>
              <i className="fa-solid fa-arrow-left me-2"></i>Dashboard
            </button>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger py-2">
            <i className="fa-solid fa-triangle-exclamation me-2"></i>
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="alert alert-success py-2">
            <i className="fa-solid fa-circle-check me-2"></i>
            {notice}
          </div>
        ) : null}

        <div className="row g-3">
          {/* Site Settings */}
          <div className="col-12 col-lg-5">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 mb-3">Site Settings</h2>

                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label">Site Title</label>
                    <input className="form-control" defaultValue={site.site_title} onBlur={(e) => saveSite({ site_title: e.target.value.trim() || "My Portfolio" })} disabled={busy} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="2" defaultValue={site.site_description || ""} onBlur={(e) => saveSite({ site_description: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Keywords</label>
                    <input className="form-control" defaultValue={site.site_keywords || ""} onBlur={(e) => saveSite({ site_keywords: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Footer Text</label>
                    <input className="form-control" defaultValue={site.footer_text || ""} onBlur={(e) => saveSite({ footer_text: e.target.value.trim() || null })} disabled={busy} />
                  </div>

                  <div className="col-12 d-flex align-items-center justify-content-between">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        defaultChecked={!!site.is_published}
                        onChange={(e) => saveSite({ is_published: e.target.checked })}
                        disabled={busy}
                        id="sitePub"
                      />
                      <label className="form-check-label" htmlFor="sitePub">Published</label>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="alert alert-warning py-2 mb-0">
                      <div className="small">
                        Logo/Favicon uploads are optional. If you want them stored in DB, tell me whether you prefer:
                        <strong> portfolio-media</strong> or <strong>portfolio-backgrounds</strong>.
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Backgrounds */}
          <div className="col-12 col-lg-7">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 mb-3">Section Backgrounds</h2>

                <div className="vstack gap-2">
                  {sectionKeys.map((key) => {
                    const row = bgByKey[key];
                    if (!row) return null;

                    const preview = row.bg_image_path ? bgUrl(row.bg_image_path) : "";

                    return (
                      <div key={key} className="border rounded bg-white p-3">
                        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                          <div className="fw-semibold text-capitalize">{key}</div>

                          <div className="d-flex gap-2 align-items-center">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                defaultChecked={!!row.is_enabled}
                                onChange={(e) => saveBg(row.id, { is_enabled: e.target.checked })}
                                disabled={busy}
                                id={`en_${row.id}`}
                              />
                              <label className="form-check-label" htmlFor={`en_${row.id}`}>Enabled</label>
                            </div>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={busy || !row.bg_image_path}
                              onClick={async () => {
                                if (!row.bg_image_path) return;
                                if (!confirm(`Remove background for "${key}"?`)) return;

                                setBusy(true);
                                setError("");
                                setNotice("");
                                try {
                                  await removeBgFile(row.bg_image_path);
                                  await saveBg(row.id, { bg_image_path: null, is_enabled: false });
                                } catch (e) {
                                  setError(e.message || "Remove failed.");
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              <i className="fa-solid fa-trash me-2"></i>Remove
                            </button>
                          </div>
                        </div>

                        <div className="row g-2 mt-2">
                          <div className="col-12 col-md-5">
                            <label className="form-label">Upload / Replace Image</label>
                            <input
                              className="form-control"
                              type="file"
                              accept="image/*"
                              disabled={busy}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                setBusy(true);
                                setError("");
                                setNotice("");

                                try {
                                  const path = await uploadBg(key, file);

                                  // optional: delete old file
                                  if (row.bg_image_path) await removeBgFile(row.bg_image_path);

                                  await saveBg(row.id, { bg_image_path: path, is_enabled: true });
                                } catch (err) {
                                  setError(err.message || "Upload failed.");
                                } finally {
                                  setBusy(false);
                                  e.target.value = "";
                                }
                              }}
                            />
                            {preview ? (
                              <img src={preview} alt={`${key} background`} className="img-fluid rounded border mt-2" />
                            ) : (
                              <div className="small text-muted mt-2">No image.</div>
                            )}
                          </div>

                          <div className="col-12 col-md-7">
                            <div className="row g-2">
                              <div className="col-12 col-md-6">
                                <label className="form-label">Overlay Opacity (0..1)</label>
                                <input
                                  className="form-control"
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max="1"
                                  defaultValue={row.overlay_opacity}
                                  onBlur={(e) => saveBg(row.id, { overlay_opacity: Number(e.target.value) })}
                                  disabled={busy}
                                />
                              </div>

                              <div className="col-12 col-md-6">
                                <label className="form-label">Position</label>
                                <input className="form-control" defaultValue={row.position} onBlur={(e) => saveBg(row.id, { position: e.target.value.trim() || "center center" })} disabled={busy} />
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label">Size</label>
                                <select className="form-select" defaultValue={row.size} onChange={(e) => saveBg(row.id, { size: e.target.value })} disabled={busy}>
                                  {["cover","contain","auto"].map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label">Repeat</label>
                                <select className="form-select" defaultValue={row.repeat} onChange={(e) => saveBg(row.id, { repeat: e.target.value })} disabled={busy}>
                                  {["no-repeat","repeat","repeat-x","repeat-y"].map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label">Attachment</label>
                                <select className="form-select" defaultValue={row.attachment} onChange={(e) => saveBg(row.id, { attachment: e.target.value })} disabled={busy}>
                                  {["scroll","fixed"].map((v) => <option key={v} value={v}>{v}</option>)}
                                </select>
                              </div>
                            </div>

                            {row.bg_image_path ? (
                              <div className="small text-muted mt-2">
                                Path: <code>{row.bg_image_path}</code>
                              </div>
                            ) : null}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
