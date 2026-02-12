"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import AdminActionModal, { useAdminActionModal } from "@/components/admin/AdminActionModal";

const sectionKeys = [
  "home",
  "about",
  "services",
  "skills",
  "experience",
  "portfolio",
  "certifications",
  "resume",
  "blog",
  "testimonials",
  "pricing",
  "contact",
];

/** helpers */
const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
};

const normalizeHex = (v) => {
  const s = String(v || "").trim();
  if (!s) return "#000000";
  const withHash = s.startsWith("#") ? s : `#${s}`;
  if (/^#([0-9a-fA-F]{3})$/.test(withHash) || /^#([0-9a-fA-F]{6})$/.test(withHash)) return withHash;
  return "#000000";
};

const toRgba = (hex, opacity) => {
  const h = normalizeHex(hex).replace("#", "");
  const o = clamp01(opacity);

  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${o})`;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { modal, confirm, success, onConfirm, onCancel } = useAdminActionModal();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [site, setSite] = useState(null);
  const [bgs, setBgs] = useState([]);

  // local UI state (so color + opacity feels immediate + safe)
  const [bgUi, setBgUi] = useState({}); // { [bgId]: { overlay_opacity, overlay_color } }

  // dirty tracking (save button enabled only when changed)
  const [dirtySite, setDirtySite] = useState(false);
  const [dirtyBg, setDirtyBg] = useState({}); // { [bgId]: true }

  // local editable site fields
  const [siteUi, setSiteUi] = useState({
    site_title: "",
    site_description: "",
    site_keywords: "",
    footer_text: "",
    is_published: true,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        router.replace("/admin/login?next=/admin/settings");
        return;
      }

      const { data: s, error: sErr } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();

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

    return () => {
      alive = false;
    };
  }, [router]);

  // init local editable site state from DB
  useEffect(() => {
    if (!site) return;
    setSiteUi({
      site_title: site.site_title || "My Portfolio",
      site_description: site.site_description || "",
      site_keywords: site.site_keywords || "",
      footer_text: site.footer_text || "",
      is_published: !!site.is_published,
    });
    setDirtySite(false);
  }, [site]);

  // init local UI state from DB rows (and keep in sync if bgs changes)
  useEffect(() => {
    const next = {};
    const dirtyNext = {};
    for (const row of bgs || []) {
      next[row.id] = {
        overlay_opacity: clamp01(row.overlay_opacity),
        overlay_color: normalizeHex(row.overlay_color || "#000000"),
      };
      dirtyNext[row.id] = false;
    }
    setBgUi(next);
    setDirtyBg(dirtyNext);
  }, [bgs]);

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

  const markDirtyBg = (id) => setDirtyBg((prev) => ({ ...prev, [id]: true }));

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
      setDirtySite(false);
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
      setDirtyBg((prev) => ({ ...prev, [id]: false }));
      toast("Saved.");
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const uploadBg = async (sectionKey, file) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
    const filename = `${sectionKey}_${crypto.randomUUID()}.${safeExt}`;
    const path = `sections/${sectionKey}/${filename}`;

    const { error: upErr } = await supabase.storage.from("portfolio-backgrounds").upload(path, file, { upsert: false });

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
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h6 mb-0">Site Settings</h2>

                  <button
                    className="btn btn-sm btn-primary"
                    disabled={busy || !dirtySite}
                    onClick={() => {
                      saveSite({
                        site_title: siteUi.site_title.trim() || "My Portfolio",
                        site_description: siteUi.site_description.trim() || null,
                        site_keywords: siteUi.site_keywords.trim() || null,
                        footer_text: siteUi.footer_text.trim() || null,
                        is_published: !!siteUi.is_published,
                      });
                    }}
                    title={dirtySite ? "Save changes" : "No changes"}
                  >
                    {busy ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk me-2"></i>Save
                      </>
                    )}
                  </button>
                </div>

                <div className="row g-2">
                  <div className="col-12">
                    <label className="form-label">Site Title</label>
                    <input
                      className="form-control"
                      value={siteUi.site_title}
                      onChange={(e) => {
                        setSiteUi((p) => ({ ...p, site_title: e.target.value }));
                        setDirtySite(true);
                      }}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={siteUi.site_description}
                      onChange={(e) => {
                        setSiteUi((p) => ({ ...p, site_description: e.target.value }));
                        setDirtySite(true);
                      }}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Keywords</label>
                    <input
                      className="form-control"
                      value={siteUi.site_keywords}
                      onChange={(e) => {
                        setSiteUi((p) => ({ ...p, site_keywords: e.target.value }));
                        setDirtySite(true);
                      }}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Footer Text</label>
                    <input
                      className="form-control"
                      value={siteUi.footer_text}
                      onChange={(e) => {
                        setSiteUi((p) => ({ ...p, footer_text: e.target.value }));
                        setDirtySite(true);
                      }}
                      disabled={busy}
                    />
                  </div>

                  <div className="col-12 d-flex align-items-center justify-content-between">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={!!siteUi.is_published}
                        onChange={(e) => {
                          setSiteUi((p) => ({ ...p, is_published: e.target.checked }));
                          setDirtySite(true);
                        }}
                        disabled={busy}
                        id="sitePub"
                      />
                      <label className="form-check-label" htmlFor="sitePub">
                        Published
                      </label>
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

                {dirtySite ? <div className="small text-muted mt-2">You have unsaved changes.</div> : null}
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

                    const ui = bgUi[row.id] || {
                      overlay_opacity: clamp01(row.overlay_opacity),
                      overlay_color: normalizeHex(row.overlay_color || "#000000"),
                    };

                    const overlayCss = toRgba(ui.overlay_color, ui.overlay_opacity);

                    return (
                      <div key={key} className="border rounded bg-white p-3">
                        <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between">
                          <div className="fw-semibold text-capitalize">{key}</div>

                          <div className="d-flex gap-2 align-items-center">
                            {dirtyBg[row.id] ? <span className="badge text-bg-warning">Unsaved</span> : null}

                            <button
                              className="btn btn-sm btn-primary"
                              disabled={busy || !dirtyBg[row.id]}
                              onClick={() =>
                                saveBg(row.id, {
                                  overlay_color: normalizeHex(ui.overlay_color),
                                  overlay_opacity: clamp01(ui.overlay_opacity),
                                })
                              }
                              title={dirtyBg[row.id] ? "Save changes" : "No changes"}
                            >
                              {busy ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Saving...
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-floppy-disk me-2"></i>Save
                                </>
                              )}
                            </button>

                            <div className="form-check ms-1">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                defaultChecked={!!row.is_enabled}
                                onChange={(e) => saveBg(row.id, { is_enabled: e.target.checked })}
                                disabled={busy}
                                id={`en_${row.id}`}
                              />
                              <label className="form-check-label" htmlFor={`en_${row.id}`}>
                                Enabled
                              </label>
                            </div>

                            <button
                              className="btn btn-sm btn-outline-danger"
                              disabled={busy || !row.bg_image_path}
                              onClick={async () => {
                                if (!row.bg_image_path) return;
                                const ok = await confirm({
                                  title: "Remove background?",
                                  message: `Remove background for "${key}"?`,
                                  confirmText: "Remove",
                                  confirmVariant: "danger",
                                });
                                if (!ok) return;

                                setBusy(true);
                                setError("");
                                setNotice("");
                                try {
                                  await removeBgFile(row.bg_image_path);
                                  await saveBg(row.id, { bg_image_path: null, is_enabled: false });
                                  success({ title: "Background removed", message: `Removed "${key}" background.` });
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
                              <div className="rounded border mt-2 overflow-hidden position-relative">
                                <img src={preview} alt={`${key} background`} className="img-fluid d-block" />
                                <div
                                  className="position-absolute top-0 start-0 w-100 h-100"
                                  style={{ background: overlayCss }}
                                  aria-hidden="true"
                                />
                              </div>
                            ) : (
                              <div className="small text-muted mt-2">No image.</div>
                            )}
                          </div>

                          <div className="col-12 col-md-7">
                            <div className="row g-2">
                              <div className="col-12 col-md-6">
                                <label className="form-label">Overlay Color</label>
                                <div className="input-group">
                                  <input
                                    type="color"
                                    className="form-control form-control-color"
                                    value={ui.overlay_color}
                                    disabled={busy}
                                    onChange={(e) => {
                                      const val = normalizeHex(e.target.value);
                                      setBgUi((prev) => ({ ...prev, [row.id]: { ...ui, overlay_color: val } }));
                                      markDirtyBg(row.id);
                                    }}
                                    title="Pick overlay color"
                                  />
                                  <input
                                    className="form-control"
                                    value={ui.overlay_color}
                                    disabled={busy}
                                    onChange={(e) => {
                                      const val = normalizeHex(e.target.value);
                                      setBgUi((prev) => ({ ...prev, [row.id]: { ...ui, overlay_color: val } }));
                                      markDirtyBg(row.id);
                                    }}
                                  />
                                </div>
                                <div className="small text-muted mt-1">Stored as hex (e.g. #000000).</div>
                              </div>

                              <div className="col-12 col-md-6">
                                <label className="form-label d-flex align-items-center justify-content-between">
                                  <span>Overlay Opacity</span>
                                  <span className="small text-muted">{ui.overlay_opacity.toFixed(2)}</span>
                                </label>

                                <input
                                  className="form-range"
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={ui.overlay_opacity}
                                  disabled={busy}
                                  onChange={(e) => {
                                    const val = clamp01(e.target.value);
                                    setBgUi((prev) => ({ ...prev, [row.id]: { ...ui, overlay_opacity: val } }));
                                    markDirtyBg(row.id);
                                  }}
                                />

                                <input
                                  className="form-control"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="1"
                                  value={ui.overlay_opacity}
                                  disabled={busy}
                                  onChange={(e) => {
                                    const val = clamp01(e.target.value);
                                    setBgUi((prev) => ({ ...prev, [row.id]: { ...ui, overlay_opacity: val } }));
                                    markDirtyBg(row.id);
                                  }}
                                />
                              </div>

                              <div className="col-12 col-md-6">
                                <label className="form-label">Position</label>
                                <input
                                  className="form-control"
                                  defaultValue={row.position}
                                  onBlur={(e) => saveBg(row.id, { position: e.target.value.trim() || "center center" })}
                                  disabled={busy}
                                />
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label">Size</label>
                                <select
                                  className="form-select"
                                  defaultValue={row.size}
                                  onChange={(e) => saveBg(row.id, { size: e.target.value })}
                                  disabled={busy}
                                >
                                  {["cover", "contain", "auto"].map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label">Repeat</label>
                                <select
                                  className="form-select"
                                  defaultValue={row.repeat}
                                  onChange={(e) => saveBg(row.id, { repeat: e.target.value })}
                                  disabled={busy}
                                >
                                  {["no-repeat", "repeat", "repeat-x", "repeat-y"].map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label">Attachment</label>
                                <select
                                  className="form-select"
                                  defaultValue={row.attachment}
                                  onChange={(e) => saveBg(row.id, { attachment: e.target.value })}
                                  disabled={busy}
                                >
                                  {["scroll", "fixed"].map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="mt-2">
                              <div className="small text-muted">
                                Overlay CSS: <code>{overlayCss}</code>
                              </div>
                              {row.bg_image_path ? (
                                <div className="small text-muted mt-1">
                                  Path: <code>{row.bg_image_path}</code>
                                </div>
                              ) : null}
                            </div>

                            {dirtyBg[row.id] ? <div className="small text-muted mt-2">You have unsaved changes.</div> : null}
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
      <AdminActionModal modal={modal} onConfirm={onConfirm} onCancel={onCancel} />
    </div>
  );
}
